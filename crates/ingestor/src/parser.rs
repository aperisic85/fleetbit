use ais::messages::aid_to_navigation_report::NavaidType;
use ais::messages::position_report::NavigationStatus;
use ais::messages::static_data_report::MessagePart;
use ais::messages::types::ShipType;
use ais::messages::AisMessage;
use ais::{AisFragments, AisParser};
use shared::models::aton::{AtonUpdate, MeteoUpdate};
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
    Aton(AtonUpdate),
    Meteo(MeteoUpdate),
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

fn navaid_type_to_i16(t: NavaidType) -> i16 {
    match t {
        NavaidType::ReferencePoint                          => 1,
        NavaidType::Racon                                   => 2,
        NavaidType::FixedStructureOffShore                  => 3,
        NavaidType::Spare                                   => 4,
        NavaidType::LightWithoutSectors                     => 5,
        NavaidType::LightWithSectors                        => 6,
        NavaidType::LeadingLightFront                       => 7,
        NavaidType::LeadingLightRear                        => 8,
        NavaidType::BeaconCardinalN                         => 9,
        NavaidType::BeaconCardinalE                         => 10,
        NavaidType::BeaconCardinalS                         => 11,
        NavaidType::BeaconCardinalW                         => 12,
        NavaidType::BeaconPortHand                          => 13,
        NavaidType::BeaconStarboardHand                     => 14,
        NavaidType::BeaconPreferredChannelPortHand          => 15,
        NavaidType::BeaconPreferredChannelStarboardHand     => 16,
        NavaidType::BeaconIsolatedDanger                    => 17,
        NavaidType::BeaconSafeWater                         => 18,
        NavaidType::BeaconSpecialMark                       => 19,
        NavaidType::CardinalMarkN                           => 20,
        NavaidType::CardinalMarkE                           => 21,
        NavaidType::CardinalMarkS                           => 22,
        NavaidType::CardinalMarkW                           => 23,
        NavaidType::PortHandMark                            => 24,
        NavaidType::StarboardHandMark                       => 25,
        NavaidType::PreferredChannelPortHand                => 26,
        NavaidType::PreferredChannelStarboardHand           => 27,
        NavaidType::IsolatedDanger                          => 28,
        NavaidType::SafeWater                               => 29,
        NavaidType::SpecialMark                             => 30,
        NavaidType::LightVesselOrLanbyOrRigs                => 31,
        NavaidType::Unknown(v)                              => v as i16,
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

        // Tip 21 — Aid to Navigation
        AisMessage::AidToNavigationReport(a) => {
            let name_str = a.name.to_string();
            let name = {
                let trimmed = name_str.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            };

            let reg = a.regional_reserved;
            // IALA A-126 §4.6.4, Page 7 (bits 7-5 = 0b111):
            //   bit 0:    alarm
            //   bits 2-1: light status (2 bita)
            //   bits 4-3: racon status (2 bita)
            //   bits 7-5: page id (must be 7 for valid status data)
            let page_id      = (reg >> 5) & 0x07;
            let alarm        = (reg & 0x01) != 0;
            let light_status = if page_id == 7 { ((reg >> 1) & 0x03) as i16 } else { 0 };
            let racon_status = if page_id == 7 { ((reg >> 3) & 0x03) as i16 } else { 0 };

            Some(ParsedMessage::Aton(AtonUpdate {
                mmsi:         a.mmsi as i32,
                name,
                aid_type:     a.aid_type.map(navaid_type_to_i16),
                lat:          a.latitude.map(|v| v as f64),
                lon:          a.longitude.map(|v| v as f64),
                off_position: a.off_position,
                virtual_aid:  a.virtual_aid,
                status_raw:   reg as i16,
                alarm,
                light_status,
                racon_status,
                station_id,
            }))
        }

        // Tip 8 — Binary Broadcast Message (DAC 001, FI 31 = meteo/hidro)
        AisMessage::BinaryBroadcastMessage(b) => {
            if b.dac == 1 && b.fid == 31 {
                decode_dfi31(b.mmsi, &b.data)
            } else {
                None
            }
        }

        _ => None,
    }
}

// Čita `len` bita iz `data` počevši od `offset` bita (MSB-first, kao AIS).
fn bits_get(data: &[u8], offset: usize, len: usize) -> u32 {
    let mut result = 0u32;
    for i in 0..len {
        let bit_pos = offset + i;
        let byte_idx = bit_pos / 8;
        let bit_idx = 7 - (bit_pos % 8);
        if byte_idx < data.len() && (data[byte_idx] >> bit_idx) & 1 == 1 {
            result |= 1 << (len - 1 - i);
        }
    }
    result
}

// Proširuje predznak unsigned vrijednosti iz `bits`-bitnog u i32.
fn sign_extend(val: u32, bits: u32) -> i32 {
    let sign_bit = 1u32 << (bits - 1);
    if val & sign_bit != 0 {
        (val | (!0u32 << bits)) as i32
    } else {
        val as i32
    }
}

// ITU-R M.1371-4, Annex 8, Table 11 — DAC 001, FI 31
// Meteorological and Hydrological data (276 bita od bita 0 u `data`).
fn decode_dfi31(mmsi: u32, data: &[u8]) -> Option<ParsedMessage> {
    // Minimalno 35 bajtova (280 bita) da pokrije 276 bita aplikacijskih podataka
    if data.len() < 35 {
        return None;
    }

    let mut off = 0usize;

    // Lat/Lon iz Type 8 ne koristimo — koristimo one iz Type 21
    off += 17; // latitude
    off += 18; // longitude
    off += 5;  // UTC day
    off += 5;  // UTC hour
    off += 6;  // UTC minute

    // Vjetar
    let wind_speed_raw = bits_get(data, off, 7); off += 7;
    let wind_gust_raw  = bits_get(data, off, 7); off += 7;
    let wind_dir_raw   = bits_get(data, off, 9); off += 9;
    off += 9; // wind gust direction

    // Temperatura zraka — 11 bita, 2's complement, ×0.1°C, N/A = 0x400 (-1024 signed)
    let air_temp_raw  = bits_get(data, off, 11); off += 11;
    let humidity_raw  = bits_get(data, off, 7);  off += 7;
    // Rosišna točka — 10 bita, 2's complement, ×0.1°C
    let dew_point_raw = bits_get(data, off, 10); off += 10;
    // Tlak zraka — 9 bita unsigned, raw 0=N/A, actual = raw + 799 hPa
    let air_pres_raw  = bits_get(data, off, 9);  off += 9;
    off += 2;  // pressure tendency
    // Vidljivost — 8 bita, ×0.1 nm, N/A = 255
    let visibility_raw = bits_get(data, off, 8); off += 8;
    off += 9;  // water level
    off += 2;  // water level trend
    off += 8;  // surface current speed
    off += 9;  // surface current direction
    off += 8;  // current speed 2
    off += 9;  // current direction 2
    off += 5;  // current depth 2
    off += 8;  // current speed 3
    off += 9;  // current direction 3
    off += 5;  // current depth 3

    // Valovi
    let wave_height_raw = bits_get(data, off, 8); off += 8;
    let wave_period_raw = bits_get(data, off, 6); off += 6;
    let wave_dir_raw    = bits_get(data, off, 9); off += 9;
    off += 8;  // swell height
    off += 6;  // swell period
    off += 9;  // swell direction
    off += 4;  // sea state (Beaufort)

    // Temperatura mora — 10 bita unsigned, offset 100 (×0.1°C - 10), N/A = 601
    let water_temp_raw = bits_get(data, off, 10); off += 10;
    // Oborine — 3 bita (1=kiša, 2=grmljavina, 3=ledena kiša, 4=mješano, 5=snijeg, 7=N/A)
    let precip_raw = bits_get(data, off, 3);
    let _ = off; // ostatak (salinity, ice) nije potreban

    // Konverzija uz N/A provjere
    let wind_speed   = if wind_speed_raw >= 127 { None } else { Some(wind_speed_raw as f32) };
    let wind_gust    = if wind_gust_raw  >= 127 { None } else { Some(wind_gust_raw as f32) };
    let wind_dir     = if wind_dir_raw   >= 360 { None } else { Some(wind_dir_raw as i16) };

    let air_temp = {
        let signed = sign_extend(air_temp_raw, 11);
        if signed == -1024 { None } else { Some(signed as f32 / 10.0) }
    };

    let humidity = if humidity_raw >= 101 { None } else { Some(humidity_raw as i16) };

    let dew_point = {
        let signed = sign_extend(dew_point_raw, 10);
        // N/A ako je izvan realnog raspona (-20 do +50°C)
        if signed > 500 || signed < -200 { None } else { Some(signed as f32 / 10.0) }
    };

    let air_pressure = if air_pres_raw == 0 { None } else { Some((air_pres_raw + 799) as i16) };
    let visibility   = if visibility_raw >= 255 { None } else { Some(visibility_raw as f32 / 10.0) };

    let water_temp = if water_temp_raw >= 601 {
        None
    } else {
        Some(water_temp_raw as f32 / 10.0 - 10.0)
    };

    let wave_height = if wave_height_raw >= 255 { None } else { Some(wave_height_raw as f32 / 10.0) };
    let wave_period = if wave_period_raw >= 63 { None } else { Some(wave_period_raw as i16) };
    let wave_dir    = if wave_dir_raw    >= 360 { None } else { Some(wave_dir_raw as i16) };
    let precipitation = if precip_raw == 0 || precip_raw == 7 { None } else { Some(precip_raw as i16) };

    Some(ParsedMessage::Meteo(MeteoUpdate {
        mmsi: mmsi as i32,
        wind_speed,
        wind_gust,
        wind_dir,
        air_temp,
        humidity,
        dew_point,
        air_pressure,
        visibility,
        water_temp,
        wave_height,
        wave_period,
        wave_dir,
        precipitation,
    }))
}
