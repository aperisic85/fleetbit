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

// SN.1/Circ.289 — DAC 001, FI 31, Meteorological and Hydrological data.
// Aplikacijski podaci počinju na bitu 0 BinaryBroadcastMessage.data
// (odmah iza FID-a koji ais knjižnica parsira zasebno).
//
// Ukupno 360 bita poruke: 56 (AIS header+DAC+FID) + 304 (app data).
// Napomena: "Time Stamp" polje od 5 bita koje se pojavljuje u nekim
// dokumentima NE POSTOJI u stvarnom SN.1/Circ.289 standardu — bez tog
// polja ukupno je točno 360 bita (Spare na kraju = 10 bita).
//
// Bit layout aplikacijskih podataka (ukupno 304 bita):
//  [  0: 24] Longitude          25 bita
//  [ 25: 48] Latitude           24 bita
//  [    49 ] Position Accuracy   1 bit
//  [ 50: 54] UTC Day             5 bita
//  [ 55: 59] UTC Hour            5 bita
//  [ 60: 65] UTC Minute          6 bita
//  [ 66: 72] Wind Speed avg      7 bita  (kn, 127=N/A)
//  [ 73: 79] Wind Gust           7 bita  (kn, 127=N/A)
//  [ 80: 88] Wind Direction      9 bita  (°, 360=N/A)
//  [ 89: 97] Wind Gust Dir       9 bita
//  [ 98:108] Air Temperature    11 bita  (×0.1°C, signed, -1024=N/A)
//  [109:115] Humidity            7 bita  (%, 101=N/A)
//  [116:125] Dew Point          10 bita  (×0.1°C, signed, 501=N/A)
//  [126:134] Air Pressure        9 bita  (hPa, 511=N/A, 0=≤799, actual=raw+799)
//  [135:136] Pressure Tendency   2 bita
//  [137:144] Visibility          8 bita  (×0.1 nm, bit7=MSB≥-indikator, 127(low7)=N/A)
//  [145:156] Water Level        12 bita
//  [157:158] Water Level Trend   2 bita
//  [159:166] Curr Speed          8 bita
//  [167:175] Curr Direction      9 bita
//  [176:183] Curr Speed 2        8 bita
//  [184:192] Curr Direction 2    9 bita
//  [193:197] Curr Level 2        5 bita
//  [198:205] Curr Speed 3        8 bita
//  [206:214] Curr Direction 3    9 bita
//  [215:219] Curr Level 3        5 bita
//  [220:227] Wave Height         8 bita  (×0.1 m, 252+=N/A)
//  [228:233] Wave Period         6 bita  (s, 61+=N/A)
//  [234:242] Wave Direction      9 bita  (°, 360=N/A)
//  [243:250] Swell Height        8 bita
//  [251:256] Swell Period        6 bita
//  [257:265] Swell Direction     9 bita
//  [266:269] Sea State           4 bita
//  [270:279] Water Temperature  10 bita  (×0.1°C, offset -10, 601=N/A)
//  [280:282] Precipitation       3 bita
//  [283:291] Salinity            9 bita
//  [292:293] Ice                 2 bita
//  [294:303] Spare              10 bita
fn decode_dfi31(mmsi: u32, data: &[u8]) -> Option<ParsedMessage> {
    // Minimalno 38 bajtova (304 bita) za sve relevantne fielove
    if data.len() < 38 {
        return None;
    }

    let mut off = 0usize;

    // Geografski i vremenski header — ne koristimo (pozicija dolazi iz Type 21)
    off += 25; // Longitude
    off += 24; // Latitude
    off += 1;  // Position Accuracy
    off += 5;  // UTC Day
    off += 5;  // UTC Hour
    off += 6;  // UTC Minute
    // off = 66

    // Vjetar
    let wind_speed_raw = bits_get(data, off, 7); off += 7;
    let wind_gust_raw  = bits_get(data, off, 7); off += 7;
    let wind_dir_raw   = bits_get(data, off, 9); off += 9;
    off += 9; // wind gust direction
    // off = 98

    // Atmosfera
    let air_temp_raw  = bits_get(data, off, 11); off += 11;
    let humidity_raw  = bits_get(data, off, 7);  off += 7;
    let dew_point_raw = bits_get(data, off, 10); off += 10;
    let air_pres_raw  = bits_get(data, off, 9);  off += 9;
    off += 2;  // pressure tendency
    // off = 137

    // Vidljivost — 8 bita, ×0.1 nm; bit7=MSB≥-indikator, donjih 7 bita = vrijednost, 0x7F=N/A
    let visibility_raw = bits_get(data, off, 8); off += 8;
    // off = 145

    off += 12; // water level (12 bita!)
    off += 2;  // water level trend
    // off = 159

    off += 8;  // surface current speed
    off += 9;  // surface current direction
    off += 8;  // current speed 2
    off += 9;  // current direction 2
    off += 5;  // current measuring level 2
    off += 8;  // current speed 3
    off += 9;  // current direction 3
    off += 5;  // current measuring level 3
    // off = 220

    // Valovi
    let wave_height_raw = bits_get(data, off, 8); off += 8;
    let wave_period_raw = bits_get(data, off, 6); off += 6;
    let wave_dir_raw    = bits_get(data, off, 9); off += 9;
    off += 8;  // swell height
    off += 6;  // swell period
    off += 9;  // swell direction
    off += 4;  // sea state (Beaufort)
    // off = 270

    // Temperatura mora — 10 bita unsigned, raw 0=−10°C, raw 600=+50°C, 601=N/A
    let water_temp_raw = bits_get(data, off, 10); off += 10;
    // Oborine — 3 bita (0=rezerv, 1=kiša, 2=grmlj., 3=led. kiša, 4=mješano, 5=snijeg, 7=N/A)
    let precip_raw = bits_get(data, off, 3);
    let _ = off;

    // Konverzija uz N/A provjere per SN.1/Circ.289
    let wind_speed = if wind_speed_raw >= 127 { None } else { Some(wind_speed_raw as f32) };
    let wind_gust  = if wind_gust_raw  >= 127 { None } else { Some(wind_gust_raw as f32) };
    let wind_dir   = if wind_dir_raw   >= 360 { None } else { Some(wind_dir_raw as i16) };

    let air_temp = {
        let signed = sign_extend(air_temp_raw, 11);
        if signed <= -1024 { None } else { Some(signed as f32 / 10.0) }
    };

    let humidity = if humidity_raw >= 101 { None } else { Some(humidity_raw as i16) };

    let dew_point = {
        let signed = sign_extend(dew_point_raw, 10);
        // N/A = 501 (signed), i sve iznad validnog raspona (-200 do +500 = -20 do +50°C)
        if signed >= 501 || signed < -200 { None } else { Some(signed as f32 / 10.0) }
    };

    // Air pressure: 511=N/A; 0="≤799 hPa"; 1-401=800-1200 hPa (actual=raw+799)
    let air_pressure = if air_pres_raw == 0 || air_pres_raw >= 402 {
        None
    } else {
        Some((air_pres_raw + 799) as i16)
    };

    // Visibility: MSB (bit 7) = "doseg senzora — stvarna vidljivost je ≥ ova vrijednost".
    // Donje 7 bita daju vrijednost u 0.1 nm. 0x7F (127) u donjih 7 bita = N/A.
    let visibility = {
        let val = visibility_raw & 0x7F;
        if val == 0x7F { None } else { Some(val as f32 / 10.0) }
    };

    // Water temp: raw 0=−10°C, raw 600=+50°C, 601=N/A
    let water_temp = if water_temp_raw >= 601 {
        None
    } else {
        Some(water_temp_raw as f32 / 10.0 - 10.0)
    };

    // Wave height: 252-254=rezerv., 255=N/A
    let wave_height = if wave_height_raw >= 252 { None } else { Some(wave_height_raw as f32 / 10.0) };
    let wave_period = if wave_period_raw >= 61 { None } else { Some(wave_period_raw as i16) };
    let wave_dir    = if wave_dir_raw    >= 360 { None } else { Some(wave_dir_raw as i16) };
    let precipitation = if precip_raw == 0 || precip_raw >= 6 { None } else { Some(precip_raw as i16) };

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
