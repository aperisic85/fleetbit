use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use shared::db::queries::vessels as db;
use std::sync::Arc;
use tokio::sync::broadcast;

use crate::state::AppState;

/// GET /ws — WebSocket upgrade
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    // 1. Pošalji snapshot trenutnih pozicija čim se klijent spoji
    match db::get_live_vessels(&state.pool).await {
        Ok(vessels) => {
            let msg = serde_json::json!({ "type": "snapshot", "vessels": vessels });
            if socket
                .send(Message::Text(msg.to_string().into()))
                .await
                .is_err()
            {
                return;
            }
        }
        Err(e) => {
            tracing::error!("WS snapshot query failed: {e:#}");
            return;
        }
    }

    // 2. Streami real-time updateove
    let mut rx: broadcast::Receiver<Arc<shared::models::vessel::VesselPosition>> =
        state.position_tx.subscribe();

    // Periodički keepalive: drži vezu toplom kroz proxyje i otkriva mrtve
    // klijente (slanje na zatvoreni socket vrati grešku → petlja prekida).
    let mut keepalive = tokio::time::interval(std::time::Duration::from_secs(25));
    keepalive.tick().await; // prvi tick je trenutačan — preskoči ga

    loop {
        tokio::select! {
            result = rx.recv() => {
                match result {
                    Ok(pos) => {
                        let msg = serde_json::json!({ "type": "update", "position": *pos });
                        if socket.send(Message::Text(msg.to_string().into())).await.is_err() {
                            break; // klijent se diskonektirao
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        tracing::warn!("WS klijent zaostao za {n} poruka");
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            _ = keepalive.tick() => {
                // WebSocket ping frame — proxyji ga prepoznaju kao aktivnost.
                if socket.send(Message::Ping(Vec::new().into())).await.is_err() {
                    break;
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    // Aplikacijski heartbeat: klijent šalje "ping", vraćamo "pong".
                    // Browser ne izlaže ping/pong okvire JS-u, pa nam ovaj
                    // tekstualni odgovor služi za detekciju žive veze na klijentu.
                    Some(Ok(Message::Text(t))) if t.as_str() == "ping" => {
                        if socket
                            .send(Message::Text("{\"type\":\"pong\"}".into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                    _ => {} // ostalo (pong, ostali text) ignoriraj
                }
            }
        }
    }
}
