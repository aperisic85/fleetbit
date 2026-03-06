use ais::messages::position_report::NavigationStatus;
use ais::messages::static_data_report::MessagePart;
use ais::messages::types::ShipType;
use ais::messages::AisMessage;
use ais::{AisFragments, AisParser};
use shared::models::vessel::{PositionUpdate, StaticUpdate};

pub struct FleetbitParser {
    inner: AisParser,
}

impl FleetbitParser {
    pub fn new() -> Self {
        Self {
            inner: AisParser::new(),
        }
    }

    pub fn parse_line(&mut self, line: &str, station_id: i16) -> Option<ParsedMessage> {
        match self.inner.parse(line.as_bytes(), true) {
            Ok(AisFragments::Complete(sentence)) => {
                let msg = sentence.message?;
                extract_message(msg, station_id)
            }
            _ => None,
        }
    }
}

#[derive(Debug)]
pub enum ParsedMessage {
    Position(PositionUpdate),
    Static(StaticUpdate),
}

fn nav_status_to_i16(status: Option<NavigationStatus>) -> Option<i16> {
    match status {
        Some(NavigationStatus::UnderWayUsingEngine)       => Some(0),
        Some(NavigationStatus::AtAnchor)                  => Some(1),
        Some(NavigationStatus::NotUnderCommand)           => Some(2),
        Some(NavigationStatus::RestrictedManouverability) => Some(3),
        Some(NavigationStatus::ConstrainedByDraught)      => Some(4),
        Some(NavigationStatus::Moored)                    => Some(5),
        Some(NavigationStatus::Aground)                   => Some(6),
        Some(NavigationStatus::EngagedInFishing)          => Some(7),
        Some(NavigationStatus::UnderWaySailing)           => Some(8),
        Some(_)                                           => Some(15),
        None                                              => None,
    }
}

fn ship_type_to_i16(ship_type: ShipType) -> i16 {
    match ship_type {
        ShipType::Reserved(v)                           => v as i16,
        ShipType::WingInGround                          => 20,
        ShipType::WingInGroundHazardousCategoryA        => 21,
        ShipType::WingInGroundHazardousCategoryB        => 22,
        ShipType::WingInGroundHazardousCategoryC        => 23,
        ShipType::WingInGroundHazardousCategoryD        => 24,
        ShipType::WingInGroundReserved(v)               => v as i16,
        ShipType::Fishing                               => 30,
        ShipType::Towing                                => 31,
        ShipType::TowingLarge                           => 32,
        ShipType::Dredging                              => 33,
        ShipType::DivingOps                             => 34,
        ShipType::MilitaryOps                           => 35,
        ShipType::Sailing                               => 36,
        ShipType::PleasureCraft                         => 37,
        ShipType::HighSpeedCraft                        => 40,
        ShipType::HighSpeedCraftHazardousCategoryA      => 41,
        ShipType::HighSpeedCraftHazardousCategoryB      => 42,
        ShipType::HighSpeedCraftHazardousCategoryC      => 43,
        ShipType::HighSpeedCraftHazardousCategoryD      => 44,
        ShipType::HighSpeedCraftReserved(v)             => v as i16,
        ShipType::HighSpeedCraftNoAdditionalInformation => 49,
        ShipType::PilotVessel                           => 50,
        ShipType::SearchAndRescueVessel                 => 51,
        ShipType::Tug                                   => 52,
        ShipType::PortTender                            => 53,
        ShipType::AntiPollutionEquipment                => 54,
        ShipType::LawEnforcement                        => 55,
        ShipType::SpareLocalVessel(v)                   => v as i16,
        ShipType::MedicalTransport                      => 58,
        ShipType::NoncombatantShip                      => 59,
        ShipType::Passenger                             => 60,
        ShipType::PassengerHazardousCategoryA           => 61,
        ShipType::PassengerHazardousCategoryB           => 62,
        ShipType::PassengerHazardousCategoryC           => 63,
        ShipType::PassengerHazardousCategoryD           => 64,
        ShipType::PassengerReserved(v)                  => v as i16,
        ShipType::PassengerNoAdditionalInformation      => 69,
        ShipType::Cargo                                 => 70,
        ShipType::CargoHazardousCategoryA               => 71,
        ShipType::CargoHazardousCategoryB               => 72,
        ShipType::CargoHazardousCategoryC               => 73,
        ShipType::CargoHazardousCategoryD               => 74,
        ShipType::CargoReserved(v)                      => v as i16,
        ShipType::CargoNoAdditionalInformation          => 79,
        ShipType::Tanker                                => 80,
        ShipType::TankerHazardousCategoryA              => 81,
        ShipType::TankerHazardousCategoryB              => 82,
        ShipType::TankerHazardousCategoryC              => 83,
        ShipType::TankerHazardousCategoryD              => 84,
        _                                               => 0,
    }
}

fn extract_message(msg: AisMessage, station_id: i16) -> Option<ParsedMessage> {
    match msg {
        // Tip 1, 2, 3 — Class A pozicija
        AisMessage::PositionReport(p) => {
            Some(ParsedMessage::Position(PositionUpdate {
                mmsi: p.mmsi as i32,
                lat: p.latitude.map(|v| v as f64),
                lon: p.longitude.map(|v| v as f64),
                sog: p.speed_over_ground,
                cog: p.course_over_ground,
                heading: p.true_heading.map(|v| v as i16),
                nav_status: nav_status_to_i16(p.navigation_status),
                message_type: p.message_type as i16,
                station_id,
            }))
        }

        // Tip 18 — Class B pozicija (charter brodice!)
        AisMessage::StandardClassBPositionReport(p) => {
            Some(ParsedMessage::Position(PositionUpdate {
                mmsi: p.mmsi as i32,
                lat: p.latitude.map(|v| v as f64),
                lon: p.longitude.map(|v| v as f64),
                sog: p.speed_over_ground,
                cog: p.course_over_ground,
                heading: p.true_heading.map(|v| v as i16),
                nav_status: None,
                message_type: p.message_type as i16,
                station_id,
            }))
        }

        // Tip 5 — Statički podaci Class A
        AisMessage::StaticAndVoyageRelatedData(s) => {
            Some(ParsedMessage::Static(StaticUpdate {
                mmsi: s.mmsi as i32,
                imo: Some(s.imo_number as i32),
                name: Some(s.vessel_name.trim().to_string()),
                callsign: Some(s.callsign.trim().to_string()),
                ship_type: s.ship_type.map(ship_type_to_i16),
                length: Some((s.dimension_to_bow + s.dimension_to_stern) as i16),
                width: Some((s.dimension_to_port + s.dimension_to_starboard) as i16),
                draught: Some(s.draught),
                destination: Some(s.destination.trim().to_string()),
            }))
        }

        // Tip 24 — Statički podaci Class B (dva dijela A i B)
        AisMessage::StaticDataReport(s) => {
            match s.message_part {
                MessagePart::PartA { vessel_name } => {
                    Some(ParsedMessage::Static(StaticUpdate {
                        mmsi: s.mmsi as i32,
                        imo: None,
                        name: Some(vessel_name.to_string().trim().to_string()),
                        callsign: None,
                        ship_type: None,
                        length: None,
                        width: None,
                        draught: None,
                        destination: None,
                    }))
                }
                MessagePart::PartB {
                    ship_type,
                    callsign,
                    dimension_to_bow,
                    dimension_to_stern,
                    dimension_to_port,
                    dimension_to_starboard,
                    ..
                } => {
                    Some(ParsedMessage::Static(StaticUpdate {
                        mmsi: s.mmsi as i32,
                        imo: None,
                        name: None,
                        callsign: Some(callsign.to_string().trim().to_string()),
                        ship_type: ship_type.map(ship_type_to_i16),
                        length: Some((dimension_to_bow + dimension_to_stern) as i16),
                        width: Some((dimension_to_port + dimension_to_starboard) as i16),
                        draught: None,
                        destination: None,
                    }))
                }
                _ => None,
            }
        }

        _ => None,
    }
}
