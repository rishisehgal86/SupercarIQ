#!/usr/bin/env python3
"""
model_spec_registry.py — Ferrari model specification registry.

Provides standard and optional equipment definitions for each supported
Ferrari model. Used by verify_equipment.py to validate LLM equipment
extraction and flag misclassifications.

Each model entry defines:
  - standard_equipment: items that come on every car (should not be scored as optional)
  - optional_equipment: items that are genuinely optional and IIV-relevant
  - scoring_overrides: per-item score adjustments
  - detection_keywords: regex/substring patterns for equipment detection
"""

from typing import TypedDict

# ── Type definitions ──────────────────────────────────────────────────────────
class ModelSpec(TypedDict):
    make: str
    model: str
    years: tuple[int, int]  # (first_year, last_year)
    standard_equipment: list[str]
    optional_equipment: dict[str, dict]  # field_name -> {label, iiv_relevant, keywords}
    scoring_overrides: dict[str, float]  # field_name -> score multiplier
    gpf_year: int | None  # Year GPF/OPF was introduced (None = never)


# ── Model registry ────────────────────────────────────────────────────────────
_REGISTRY: dict[str, ModelSpec] = {

    "812-superfast": {
        "make": "Ferrari",
        "model": "812 Superfast",
        "years": (2017, 2022),
        "gpf_year": None,  # 812 Superfast never had GPF (GTS did from 2020)
        "standard_equipment": [
            "Carbon ceramic brakes (CCB)",
            "MagneRide suspension",
            "Rear-wheel steering (4WS)",
            "Electric power steering",
            "7-speed dual-clutch gearbox (F1 DCT)",
            "Side slip control (SSC 6.1)",
            "Ferrari Dynamic Enhancer (FDE+)",
            "Launch control",
            "Manettino driving mode selector",
            "Apple CarPlay",
            "Infotainment display",
            "Passenger display",
            "Reversing camera",
            "Parking sensors (front & rear)",
            "Keyless entry",
            "Automatic climate control",
            "LED headlights",
            "Daytime running lights",
            "HELE system",
            "Tyre pressure monitoring",
        ],
        "optional_equipment": {
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift", "nose lift", "hydraulic lift", "speed bump"],
            },
            "carbon_pack": {
                "label": "Carbon fibre exterior pack",
                "iiv_relevant": True,
                "keywords": ["carbon fibre pack", "carbon fiber pack", "carbon pack", "carbon exterior"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made", "tailor-made", "one-off", "bespoke commission"],
            },
            "daytona_seats": {
                "label": "Daytona racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat", "sport seat", "bucket seat"],
            },
            "carbon_steering_wheel": {
                "label": "Carbon fibre steering wheel",
                "iiv_relevant": True,
                "keywords": ["carbon steering", "carbon fibre steering wheel", "carbon fiber steering wheel"],
            },
            "track_pack": {
                "label": "Track pack / telemetry",
                "iiv_relevant": True,
                "keywords": ["track pack", "track-pack", "telemetry", "data logger"],
            },
            "carbon_dashboard": {
                "label": "Carbon fibre dashboard",
                "iiv_relevant": True,
                "keywords": ["carbon dashboard", "carbon fibre dashboard", "carbon dash"],
            },
            "carbon_console": {
                "label": "Carbon fibre centre console",
                "iiv_relevant": True,
                "keywords": ["carbon console", "carbon centre console", "carbon center console"],
            },
            "titanium_exhaust": {
                "label": "Titanium exhaust / tailpipes",
                "iiv_relevant": True,
                "keywords": ["titanium exhaust", "titanium tailpipe", "titanium tip"],
            },
            "special_colour": {
                "label": "Special / Tailor Made colour",
                "iiv_relevant": True,
                "keywords": ["tailor made colour", "special order colour", "unique colour", "tour de france",
                             "giallo modena", "grigio silverstone", "bianco avus", "verde british"],
            },
            "alcantara_interior": {
                "label": "Alcantara interior elements",
                "iiv_relevant": True,
                "keywords": ["alcantara", "suede"],
            },
            "surround_view": {
                "label": "Surround view camera system",
                "iiv_relevant": False,
                "keywords": ["surround view", "360 camera", "360° camera"],
            },
            "scuderia_shields": {
                "label": "Scuderia Ferrari shields on fenders",
                "iiv_relevant": False,
                "keywords": ["scuderia ferrari shield", "scuderia shield", "fender shield"],
            },
            "coloured_calipers": {
                "label": "Coloured brake callipers",
                "iiv_relevant": False,
                "keywords": ["colour calliper", "color calliper", "coloured calliper", "yellow calliper",
                             "red calliper", "brake calliper colour"],
            },
            "forged_wheels": {
                "label": "Forged wheels (diamond-polished)",
                "iiv_relevant": False,
                "keywords": ["forged wheel", "diamond polished wheel", "diamond-polished"],
            },
        },
        "scoring_overrides": {
            "suspension_lift": 1.2,
            "carbon_pack": 1.1,
            "atelier": 1.5,
            "daytona_seats": 1.1,
            "track_pack": 1.1,
        },
    },

    "812-gts": {
        "make": "Ferrari",
        "model": "812 GTS",
        "years": (2019, 2024),
        "gpf_year": 2020,  # GTS introduced with GPF from 2020
        "standard_equipment": [
            "Carbon ceramic brakes (CCB)",
            "MagneRide suspension",
            "Rear-wheel steering (4WS)",
            "Retractable hardtop",
            "7-speed dual-clutch gearbox (F1 DCT)",
            "Side slip control",
            "Apple CarPlay",
            "Infotainment display",
            "Passenger display",
            "Reversing camera",
            "Parking sensors",
            "Keyless entry",
            "Automatic climate control",
            "LED headlights",
            "HELE system",
        ],
        "optional_equipment": {
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift", "nose lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre exterior pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack", "carbon exterior", "carbon fibre pack"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made", "bespoke"],
            },
            "daytona_seats": {
                "label": "Daytona racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat", "sport seat"],
            },
            "track_pack": {
                "label": "Track pack / telemetry",
                "iiv_relevant": True,
                "keywords": ["track pack", "telemetry", "data logger"],
            },
            "special_colour": {
                "label": "Special / Tailor Made colour",
                "iiv_relevant": True,
                "keywords": ["tailor made colour", "tour de france", "giallo modena", "grigio silverstone"],
            },
        },
        "scoring_overrides": {
            "atelier": 1.5,
            "suspension_lift": 1.2,
        },
    },

    "f8-tributo": {
        "make": "Ferrari",
        "model": "F8 Tributo",
        "years": (2019, 2023),
        "gpf_year": 2019,
        "standard_equipment": [
            "3.9L twin-turbo V8",
            "7-speed dual-clutch gearbox",
            "Side slip control",
            "Ferrari Dynamic Enhancer",
            "Apple CarPlay",
            "Infotainment display",
            "Reversing camera",
            "Parking sensors",
            "LED headlights",
            "HELE system",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb", "brembo ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift", "nose lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack", "carbon exterior"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
            "daytona_seats": {
                "label": "Daytona racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat"],
            },
            "track_pack": {
                "label": "Track pack",
                "iiv_relevant": True,
                "keywords": ["track pack", "telemetry"],
            },
        },
        "scoring_overrides": {
            "ccb": 1.3,
            "atelier": 1.4,
        },
    },

    "458-italia": {
        "make": "Ferrari",
        "model": "458 Italia",
        "years": (2009, 2015),
        "gpf_year": None,
        "standard_equipment": [
            "4.5L naturally aspirated V8",
            "7-speed dual-clutch gearbox",
            "E-diff",
            "F1-TRAC traction control",
            "Manettino",
            "LED headlights",
            "Reversing camera",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack", "carbon exterior"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
            "daytona_seats": {
                "label": "Daytona / racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat", "sport seat"],
            },
        },
        "scoring_overrides": {
            "ccb": 1.3,
        },
    },

    "488-gtb": {
        "make": "Ferrari",
        "model": "488 GTB",
        "years": (2015, 2019),
        "gpf_year": None,
        "standard_equipment": [
            "3.9L twin-turbo V8",
            "7-speed dual-clutch gearbox",
            "Side slip control",
            "Apple CarPlay",
            "LED headlights",
            "Reversing camera",
            "Parking sensors",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
            "daytona_seats": {
                "label": "Daytona / racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat"],
            },
        },
        "scoring_overrides": {
            "ccb": 1.3,
        },
    },

    "california-t": {
        "make": "Ferrari",
        "model": "California T",
        "years": (2014, 2017),
        "gpf_year": None,
        "standard_equipment": [
            "3.9L twin-turbo V8",
            "7-speed dual-clutch gearbox",
            "Retractable hardtop",
            "Apple CarPlay",
            "LED headlights",
            "Reversing camera",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift"],
            },
            "handling_speciale": {
                "label": "Handling Speciale package",
                "iiv_relevant": True,
                "keywords": ["handling speciale", "hs package"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
        },
        "scoring_overrides": {},
    },

    "portofino": {
        "make": "Ferrari",
        "model": "Portofino",
        "years": (2017, 2020),
        "gpf_year": 2018,
        "standard_equipment": [
            "3.9L twin-turbo V8",
            "7-speed dual-clutch gearbox",
            "Retractable hardtop",
            "Apple CarPlay",
            "LED headlights",
            "Reversing camera",
            "Parking sensors",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
        },
        "scoring_overrides": {},
    },

    "roma": {
        "make": "Ferrari",
        "model": "Roma",
        "years": (2020, 2025),
        "gpf_year": 2020,
        "standard_equipment": [
            "3.9L twin-turbo V8",
            "8-speed dual-clutch gearbox",
            "Side slip control",
            "Apple CarPlay",
            "LED headlights",
            "Reversing camera",
            "Parking sensors",
            "Keyless entry",
        ],
        "optional_equipment": {
            "ccb": {
                "label": "Carbon ceramic brakes",
                "iiv_relevant": True,
                "keywords": ["carbon ceramic brake", "ccb"],
            },
            "suspension_lift": {
                "label": "Front suspension lift",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift"],
            },
            "carbon_pack": {
                "label": "Carbon fibre pack",
                "iiv_relevant": True,
                "keywords": ["carbon pack"],
            },
            "atelier": {
                "label": "Ferrari Atelier / Tailor Made",
                "iiv_relevant": True,
                "keywords": ["atelier", "tailor made"],
            },
            "daytona_seats": {
                "label": "Daytona / racing seats",
                "iiv_relevant": True,
                "keywords": ["daytona seat", "racing seat"],
            },
            "track_pack": {
                "label": "Track pack",
                "iiv_relevant": True,
                "keywords": ["track pack", "telemetry"],
            },
        },
        "scoring_overrides": {
            "ccb": 1.2,
        },
    },

    # ─────────────────────────────────────────────────────────────────────────
    # FERRARI 488 PISTA
    # Research: Twin-turbo 3.9L V8, 710bhp, 2018-2019, ~3,500 units worldwide
    # GPF: Not fitted (pre-GPF era for this model)
    # Investment: STRONG BUY — limited production, last pure V8 special series
    # ─────────────────────────────────────────────────────────────────────────
    "488-pista": {
        "make": "Ferrari",
        "model": "488 Pista",
        "years": (2018, 2019),
        "gpf_year": None,  # 488 Pista predates GPF mandate
        # ── Investment context (used by LLM content generator) ─────────────────
        "engine_spec": "3.9L twin-turbocharged V8, 710bhp, 770Nm torque — most powerful V8 Ferrari built at launch",
        "total_units_produced": "approximately 2,000 worldwide (coupe + Spider combined; exact figure unconfirmed by Ferrari)",
        "original_uk_price_gbp": "approximately £250,000 (2018 launch price, coupe)",
        "key_investment_facts": (
            "The 488 Pista is the track-focused homologation special of the 488 GTB, sharing 50% of its components with the "
            "Ferrari FXX K race car. It was the most powerful V8 Ferrari ever built at launch (710bhp). "
            "Key investment differentiators: (1) Pre-GPF status — all 488 Pistas were built before the GPF/OPF mandate, "
            "preserving the raw exhaust note. (2) Carbon fibre wheels (optional) are the single most desirable option — "
            "only ~200 sets were produced globally and they reduce unsprung weight by 40%. (3) Assetto Fiorano package adds "
            "Multimatic shock absorbers (from the Ferrari FXX K), titanium exhaust, and aero enhancements. "
            "(4) Production ended in 2019 after just 2 years — no direct successor. The F8 Tributo replaced the 488 GTB "
            "but there is no F8 Pista equivalent, making the 488 Pista the last of its kind. "
            "(5) The name 'Pista' means 'track' in Italian — this is Ferrari's most track-focused road car since the 458 Speciale. "
            "(6) Super Trofeo Omologata (STO) is the Lamborghini equivalent; the 488 Pista is considered the superior investment "
            "due to lower production numbers and Ferrari brand premium. "
            "Investment risks: high maintenance costs (£15,000–£25,000 major service), twin-turbo complexity vs NA predecessors, "
            "and the Spider variant (convertible) may dilute coupe exclusivity."
        ),
        "standard_equipment": [
            "Carbon ceramic brakes (CCB) — standard on all 488 Pista",
            "Carbon fibre front flaps (standard aero)",
            "Side air splitters (standard aero)",
            "Carbon fibre engine bay (standard)",
            "Carbon fibre rear diffuser (standard)",
            "Michelin Pilot Sport Cup 2 tyres (standard)",
            "20-inch forged alloy wheels (standard)",
            "One-piece carbon fibre racing seats (standard)",
            "Dual-zone automatic climate control (standard)",
            "Keyless entry and ignition (standard)",
            "Backup camera (standard)",
            "Rear parking sensors (standard)",
            "Integrated navigation (standard)",
            "Bluetooth connectivity (standard)",
            "LED headlights (standard)",
            "Lithium-ion battery (standard)",
            "Carbon fibre sill panels and centre console (standard)",
            "Side slip control (standard)",
            "Launch control (standard)",
            "7-speed dual-clutch transmission (standard)",
        ],
        "optional_equipment": {
            "carbon_wheels": {
                "label": "Carbon fibre wheels",
                "iiv_relevant": True,
                "keywords": ["carbon wheels", "carbon fibre wheels", "carbon fiber wheels", "lightweight wheels"],
            },
            "front_lift": {
                "label": "Front suspension lift system",
                "iiv_relevant": True,
                "keywords": ["front lift", "nose lift", "suspension lifter", "suspension lift", "hydraulic lift"],
            },
            "racing_stripe": {
                "label": "Racing stripe (single or bi-colour)",
                "iiv_relevant": True,
                "keywords": ["racing stripe", "livery", "dual stripe", "single stripe", "centre stripe"],
            },
            "historical_paint": {
                "label": "Historical Ferrari paint",
                "iiv_relevant": True,
                "keywords": ["historical paint", "rosso dino", "grigio ferro", "historical colour"],
            },
            "extracampionario_paint": {
                "label": "Extracampionario / bespoke paint",
                "iiv_relevant": True,
                "keywords": ["extracampionario", "bespoke paint", "special paint", "tailor made colour",
                             "viola hong kong", "azzurro la plata", "nuovo rosso formula 1"],
            },
            "fixed_bucket_seats": {
                "label": "Single piece fixed bucket seats",
                "iiv_relevant": True,
                "keywords": ["fixed bucket seats", "single piece seats", "non-adjustable seats"],
            },
            "four_point_harness": {
                "label": "4-point racing harnesses",
                "iiv_relevant": True,
                "keywords": ["4-point harness", "racing harness", "four point harness"],
            },
            "carbon_rear_moulding": {
                "label": "Carbon fibre rear moulding",
                "iiv_relevant": True,
                "keywords": ["carbon rear moulding", "cf rear trim", "carbon rear trim"],
            },
            "afs_headlights": {
                "label": "Adaptive front lighting system (AFS)",
                "iiv_relevant": False,
                "keywords": ["afs", "adaptive headlights", "adaptive front lighting"],
            },
            "scuderia_shields": {
                "label": "Scuderia Ferrari shields",
                "iiv_relevant": False,
                "keywords": ["scuderia shields", "ferrari shields"],
            },
        },
        "scoring_overrides": {
            "carbon_wheels": 1.5,
            "front_lift": 1.3,
            "extracampionario_paint": 1.5,
            "historical_paint": 1.3,
            "racing_stripe": 1.2,
        },
    },

    # ─────────────────────────────────────────────────────────────────────────
    # FERRARI SF90 STRADALE
    # Research: PHEV 4.0L TT V8 + 3 electric motors, 1000bhp, 2020-present
    # GPF: Yes, from 2019 (OPF fitted as standard)
    # Investment: CONSIDER — high production, hybrid complexity, tech obsolescence risk
    # ─────────────────────────────────────────────────────────────────────────
    "sf90-stradale": {
        "make": "Ferrari",
        "model": "SF90 Stradale",
        # ── Investment context (used by LLM content generator) ─────────────────
        "engine_spec": "4.0L twin-turbocharged V8 + 3 electric motors (PHEV), 1,000bhp combined — Ferrari's first road car to break the 1,000bhp barrier",
        "total_units_produced": "ongoing production (2020–present); estimated 3,000+ units globally by 2025",
        "original_uk_price_gbp": "approximately £370,000 (2020 launch price, coupe)",
        "key_investment_facts": (
            "The SF90 Stradale is Ferrari's first series-production PHEV and the first Ferrari road car to exceed 1,000bhp. "
            "It uses a 4.0L twin-turbo V8 paired with three electric motors (one rear-axle, two front-axle) giving 4WD capability. "
            "Key investment differentiators: (1) Assetto Fiorano package is the most desirable spec — adds Multimatic dampers, "
            "titanium exhaust, carbon fibre racing seats, and Lexan rear screen, commanding £30,000–£50,000 premium. "
            "(2) The SF90 Spider (convertible) commands £40,000–£80,000 premium over the coupe. "
            "(3) eManettino drive mode selector adds full EV mode (25km range), hybrid, and performance modes. "
            "(4) The SF90 XX Stradale (2024) is the track-focused variant with 1,030bhp — ownership of the standard SF90 "
            "may be diluted by the XX variant. "
            "Investment risks: (1) High-voltage battery degradation — replacement cost unknown but estimated £50,000+. "
            "(2) Hybrid complexity adds significant maintenance risk vs naturally aspirated predecessors. "
            "(3) Ongoing production means no scarcity premium yet — prices have softened 30%+ from 2022 peak. "
            "(4) Technology obsolescence risk — PHEV technology will be superseded by full EV. "
            "(5) The SF90 is Ferrari's gateway to electrification — future models will be fully electric, "
            "which may either enhance or diminish the SF90's historical significance."
        ),
        "years": (2020, 2024),
        "gpf_year": 2019,  # OPF/GPF fitted as standard on all SF90
        "standard_equipment": [
            "4.0L Twin-Turbo V8 engine (standard)",
            "Three electric motors (standard)",
            "8-speed dual-clutch transmission (standard)",
            "All-wheel drive (standard)",
            "eSSC electric Side Slip Control (standard)",
            "eTC electric Traction Control (standard)",
            "Brake-by-wire system (standard)",
            "Carbon-ceramic brakes (standard)",
            "7.9 kWh lithium-ion battery (standard)",
            "eManettino drive mode selector (standard)",
            "410mm curved digital instrument display (standard)",
            "Head-up display (standard)",
            "Capacitive touch steering wheel controls (standard)",
            "Aluminium and carbon fibre chassis (standard)",
            "LED headlights and taillights (standard)",
            "Dual-zone automatic climate control (standard)",
            "Keyless entry and start (standard)",
            "Launch control (standard)",
            "Adaptive suspension (standard)",
            "OPF/GPF filter (standard — all SF90)",
        ],
        "optional_equipment": {
            "assetto_fiorano": {
                "label": "Assetto Fiorano package",
                "iiv_relevant": True,
                "keywords": ["assetto fiorano", "fiorano package", "fiorano pack", "af package"],
            },
            "suspension_lift": {
                "label": "Front suspension lift system",
                "iiv_relevant": True,
                "keywords": ["suspension lift", "front lift", "nose lift", "suspension lifter"],
            },
            "carbon_exterior_pack": {
                "label": "Extensive carbon fibre exterior pack",
                "iiv_relevant": True,
                "keywords": ["carbon front spoiler", "carbon diffuser", "carbon side splitter", "carbon underdoor",
                             "carbon exterior", "carbon fibre exterior"],
            },
            "carbon_racing_seats": {
                "label": "Carbon fibre racing seats",
                "iiv_relevant": True,
                "keywords": ["carbon racing seats", "carbon fibre racing seats", "carbon seats"],
            },
            "special_paint": {
                "label": "Special / Extracampionario paint",
                "iiv_relevant": True,
                "keywords": ["extracampionario", "special paint", "giallo montecarlo", "tailor made colour",
                             "special colour", "bespoke paint"],
            },
            "carbon_driver_zone": {
                "label": "Carbon fibre driver zone + LEDs",
                "iiv_relevant": True,
                "keywords": ["carbon driver zone", "driver zone leds", "carbon driver zone"],
            },
            "scuderia_shields": {
                "label": "Scuderia Ferrari shields",
                "iiv_relevant": False,
                "keywords": ["scuderia shields", "ferrari shields"],
            },
            "black_exhaust": {
                "label": "Black ceramic exhaust pipes",
                "iiv_relevant": True,
                "keywords": ["black exhaust", "ceramic exhaust", "black ceramic exhaust"],
            },
            "ppf": {
                "label": "Anti-stone chipping film (PPF)",
                "iiv_relevant": False,
                "keywords": ["ppf", "stone chip film", "paint protection film", "anti stone"],
            },
        },
        "scoring_overrides": {
            "assetto_fiorano": 1.5,
            "carbon_exterior_pack": 1.3,
            "special_paint": 1.4,
            "carbon_racing_seats": 1.2,
        },
    },

    # ─────────────────────────────────────────────────────────────────────────
    # LAMBORGHINI HURACÁN STO
    # Research: NA 5.2L V10, 630bhp, 2021-2023, ~1,500 units worldwide
    # GPF: Not fitted (Lamborghini V10 not subject to GPF for this application)
    # Investment: BUY — limited production, track-focused, last pure V10 Huracán variant
    # ─────────────────────────────────────────────────────────────────────────
    "huracan-sto": {
        "make": "Lamborghini",
        "model": "Huracán STO",
        "years": (2021, 2023),
        "gpf_year": None,  # Huracán STO V10 not subject to GPF
        # ── Investment context (used by LLM content generator) ─────────────────
        "engine_spec": "5.2L naturally aspirated V10, 640bhp, 565Nm torque — the last pure V10 Huracán variant",
        "total_units_produced": "approximately 1,000 units worldwide (2021–2023 production run)",
        "original_uk_price_gbp": "approximately £280,000 (2021 UK launch price)",
        "key_investment_facts": (
            "The Huracán STO (Super Trofeo Omologata) is the road-legal homologation of the Lamborghini Super Trofeo EVO2 race car. "
            "STO stands for 'Super Trofeo Omologata' — it is literally a race car homologated for road use. "
            "Key investment differentiators: (1) The STO is the last and most extreme naturally aspirated V10 Huracán — "
            "production ended in 2023 and the Urus SE and future Huracán successor will be hybrid/electric. "
            "(2) The 'Cofango' (Italian: cofano + parafango = bonnet + fender) is the defining feature — a single carbon fibre "
            "clamshell that replaces the front bonnet and both front fenders. Condition of the Cofango is the primary "
            "value differentiator in the used market. "
            "(3) The STO is rear-wheel drive only — unlike the Huracán Evo (AWD). This is a deliberate track-focused choice. "
            "(4) 75% of body panels are carbon fibre (standard). "
            "(5) Pirelli P Zero Trofeo R tyres are standard — track-day ready from the factory. "
            "(6) The STO is the spiritual successor to the Huracán Performante Spyder and the Huracán LP 620-2 Super Trofeo. "
            "Investment risks: (1) The Cofango is expensive to repair (£15,000–£30,000 for a damaged unit). "
            "(2) Trofeo R tyres wear quickly on road use (£2,000–£3,000 per set). "
            "(3) Limited practicality — no front lift system standard (optional), very stiff ride. "
            "(4) The Huracán STO Spyder does not exist — coupe only, which limits the addressable buyer pool. "
            "(5) As the market transitions to hybrid/electric, the STO's pure NA V10 becomes a rarity premium asset."
        ),
        "standard_equipment": [
            "5.2L naturally aspirated V10 engine (standard)",
            "7-speed dual-clutch transmission (standard)",
            "Rear-wheel drive (standard)",
            "Carbon fibre body panels — front hood, front fenders, rear wing, engine cover (standard on STO)",
            "NACA air intakes in underbody (standard)",
            "Full LED lighting (standard)",
            "Carbon ceramic brakes (standard on STO)",
            "Pirelli P Zero Trofeo R tyres (standard)",
            "20-inch forged alloy wheels (standard)",
            "Lamborghini Dinamica Veicolo Integrata LDVI (standard)",
            "Lamborghini Dynamic Steering LDS (standard)",
            "Magnetic ride suspension (standard)",
            "Launch control (standard)",
            "Anima driving mode selector (standard)",
            "Electrochromic interior rear-view mirror (standard)",
            "Automatic dual-zone air conditioning (standard)",
            "Remote central locking (standard)",
            "Flush-mounted exterior door handles (standard)",
            "Full carbon fibre monocoque chassis (standard)",
            "Telemetry system (standard)",
        ],
        "optional_equipment": {
            "ad_personam_livery": {
                "label": "Ad Personam custom livery / paint",
                "iiv_relevant": True,
                "keywords": ["ad personam", "custom livery", "bespoke livery", "special paint", "custom colour",
                             "racing livery", "two-tone", "three-colour"],
            },
            "front_lift": {
                "label": "Front suspension lift system",
                "iiv_relevant": True,
                "keywords": ["front lift", "nose lift", "suspension lift", "front lifter"],
            },
            "carbon_bucket_seats": {
                "label": "Carbon fibre bucket seats",
                "iiv_relevant": True,
                "keywords": ["carbon bucket seats", "carbon fibre seats", "bucket seats", "carbon seats"],
            },
            "helmet_compartment": {
                "label": "Helmet compartment (rear parcel shelf)",
                "iiv_relevant": True,
                "keywords": ["helmet compartment", "helmet shelf", "helmet storage"],
            },
            "transparent_engine_cover": {
                "label": "Transparent engine cover",
                "iiv_relevant": True,
                "keywords": ["transparent engine cover", "glass engine cover", "clear engine cover"],
            },
            "carbon_interior_pack": {
                "label": "Carbon fibre interior pack",
                "iiv_relevant": True,
                "keywords": ["carbon interior", "carbon fibre interior", "carbon dashboard", "carbon console"],
            },
            "alcantara_interior": {
                "label": "Alcantara interior trim",
                "iiv_relevant": True,
                "keywords": ["alcantara", "suede interior", "alcantara interior"],
            },
            "racing_harness": {
                "label": "Racing harness (4-point)",
                "iiv_relevant": True,
                "keywords": ["racing harness", "4-point harness", "four point harness"],
            },
            "roll_cage": {
                "label": "Roll cage / roll bar",
                "iiv_relevant": True,
                "keywords": ["roll cage", "roll bar", "safety cage"],
            },
        },
        "scoring_overrides": {
            "ad_personam_livery": 1.5,
            "front_lift": 1.3,
            "carbon_bucket_seats": 1.2,
        },
    },
}

# ── Public API ────────────────────────────────────────────────────────────────
def get_supported_models() -> list[str]:
    """Return list of supported model keys."""
    return list(_REGISTRY.keys())


def get_model_spec(model_key: str) -> ModelSpec | None:
    """Return the full spec for a model, or None if not found."""
    return _REGISTRY.get(model_key)


def get_standard_equipment(model_key: str) -> list[str]:
    """Return the list of standard equipment items for a model."""
    spec = _REGISTRY.get(model_key)
    if not spec:
        return []
    return spec["standard_equipment"]


def get_optional_equipment(model_key: str) -> dict[str, dict]:
    """Return the optional equipment dict for a model."""
    spec = _REGISTRY.get(model_key)
    if not spec:
        return {}
    return spec["optional_equipment"]


def get_scoring_overrides(model_key: str) -> dict[str, float]:
    """Return scoring override multipliers for a model."""
    spec = _REGISTRY.get(model_key)
    if not spec:
        return {}
    return spec.get("scoring_overrides", {})


def get_detection_keywords(model_key: str, field_name: str) -> list[str]:
    """Return detection keywords for a specific optional equipment field."""
    optional = get_optional_equipment(model_key)
    item = optional.get(field_name, {})
    return item.get("keywords", [])


def detect_equipment_from_list(model_key: str, equipment_list: list[str]) -> dict[str, bool]:
    """
    Detect which optional equipment items are present based on keyword matching.
    Returns a dict of field_name -> bool.
    """
    optional = get_optional_equipment(model_key)
    results = {}
    equip_lower = [e.lower() for e in (equipment_list or [])]

    for field_name, item in optional.items():
        keywords = item.get("keywords", [])
        detected = any(
            any(kw.lower() in eq for eq in equip_lower)
            for kw in keywords
        )
        results[field_name] = detected

    return results


# ── Active models for pipeline and content generation ─────────────────────────
# Models in this list are actively scraped and have LLM content generated.
# Order determines display order on the site.
_ACTIVE_MODELS = [
    "812-superfast",
    "812-gts",
    "488-pista",
    "sf90-stradale",
    "huracan-sto",
    "f8-tributo",
    "458-italia",
    "488-gtb",
    "california-t",
    "portofino",
    "roma",
]

# ── Public (free/ungated) models ──────────────────────────────────────────────
_PUBLIC_MODELS = ["812-superfast"]

# ── Enriched model metadata (for model_configs DB table) ─────────────────────
_MODEL_METADATA: dict[str, dict] = {
    "812-superfast": {
        "total_units_produced": "~9,000 worldwide",
        "engine_spec": "6.5L naturally aspirated V12, 789bhp",
        "original_uk_price_gbp": "£263,000",
        "hero_image_url": "",
        "sort_order": 1,
    },
    "812-gts": {
        "total_units_produced": "~1,800 worldwide (limited production)",
        "engine_spec": "6.5L naturally aspirated V12, 789bhp (convertible)",
        "original_uk_price_gbp": "£295,000",
        "hero_image_url": "",
        "sort_order": 2,
    },
    "488-pista": {
        "total_units_produced": "~3,500 worldwide",
        "engine_spec": "3.9L twin-turbo V8, 710bhp",
        "original_uk_price_gbp": "£252,000",
        "hero_image_url": "",
        "sort_order": 3,
    },
    "sf90-stradale": {
        "total_units_produced": "~2,000+ per year (ongoing production)",
        "engine_spec": "4.0L twin-turbo V8 + 3 electric motors, 1,000bhp (PHEV)",
        "original_uk_price_gbp": "£390,000",
        "hero_image_url": "",
        "sort_order": 4,
    },
    "huracan-sto": {
        "total_units_produced": "~1,500 worldwide",
        "engine_spec": "5.2L naturally aspirated V10, 630bhp",
        "original_uk_price_gbp": "£255,000",
        "hero_image_url": "",
        "sort_order": 5,
    },
    "f8-tributo": {
        "total_units_produced": "~3,000+ worldwide",
        "engine_spec": "3.9L twin-turbo V8, 710bhp",
        "original_uk_price_gbp": "£230,000",
        "hero_image_url": "",
        "sort_order": 6,
    },
    "458-italia": {
        "total_units_produced": "~9,150 worldwide",
        "engine_spec": "4.5L naturally aspirated V8, 562bhp",
        "original_uk_price_gbp": "£170,000",
        "hero_image_url": "",
        "sort_order": 7,
    },
    "488-gtb": {
        "total_units_produced": "~9,000 worldwide",
        "engine_spec": "3.9L twin-turbo V8, 660bhp",
        "original_uk_price_gbp": "£188,000",
        "hero_image_url": "",
        "sort_order": 8,
    },
    "california-t": {
        "total_units_produced": "~5,000 worldwide",
        "engine_spec": "3.9L twin-turbo V8, 552bhp",
        "original_uk_price_gbp": "£155,000",
        "hero_image_url": "",
        "sort_order": 9,
    },
    "portofino": {
        "total_units_produced": "~4,000 worldwide",
        "engine_spec": "3.9L twin-turbo V8, 591bhp",
        "original_uk_price_gbp": "£175,000",
        "hero_image_url": "",
        "sort_order": 10,
    },
    "roma": {
        "total_units_produced": "~3,000+ worldwide",
        "engine_spec": "3.9L twin-turbo V8, 612bhp",
        "original_uk_price_gbp": "£195,000",
        "hero_image_url": "",
        "sort_order": 11,
    },
}

# ── Colour desirability maps (per model) ─────────────────────────────────────
# Score: 1.0 = neutral, >1.0 = desirable, <1.0 = less desirable
_COLOUR_DESIRABILITY: dict[str, dict[str, float]] = {
    "812-superfast": {
        "rosso corsa": 1.4,
        "rosso scuderia": 1.3,
        "grigio silverstone": 1.2,
        "nero daytona": 1.2,
        "giallo modena": 1.1,
        "bianco avus": 1.1,
        "blu pozzi": 1.1,
        "blu tour de france": 1.2,
        "verde british": 1.0,
        "argento nürburgring": 1.0,
        "rosso portofino": 0.9,
        "grigio ferro": 0.9,
        "bianco italia": 0.85,
    },
    "488-pista": {
        "rosso corsa": 1.5,
        "rosso scuderia": 1.4,
        "nero daytona": 1.3,
        "grigio silverstone": 1.2,
        "giallo modena": 1.2,
        "bianco avus": 1.1,
        "blu pozzi": 1.1,
        "verde british": 1.0,
        "rosso portofino": 0.9,
    },
    "sf90-stradale": {
        "rosso corsa": 1.4,
        "nero daytona": 1.3,
        "grigio silverstone": 1.2,
        "bianco avus": 1.1,
        "giallo modena": 1.1,
        "rosso scuderia": 1.3,
        "blu pozzi": 1.1,
        "verde british": 1.0,
    },
    "huracan-sto": {
        "arancio borealis": 1.5,
        "blu glauco": 1.4,
        "bianco monocerus": 1.3,
        "verde selvans": 1.3,
        "giallo inti": 1.2,
        "nero noctis": 1.2,
        "rosso efesto": 1.2,
        "grigio lynx": 1.0,
        "bianco isis": 0.9,
    },
    "812-gts": {
        "rosso corsa": 1.4,
        "rosso scuderia": 1.3,
        "grigio silverstone": 1.2,
        "nero daytona": 1.2,
        "giallo modena": 1.1,
        "bianco avus": 1.1,
        "blu pozzi": 1.1,
        "verde british": 1.0,
    },
}


def get_active_models() -> list[str]:
    """Return list of actively scraped/displayed model keys."""
    return [m for m in _ACTIVE_MODELS if m in _REGISTRY]


def get_public_models() -> list[str]:
    """Return list of free/ungated model keys."""
    return _PUBLIC_MODELS


def is_public_model(model_key: str) -> bool:
    """Return True if the model is free/ungated."""
    return model_key in _PUBLIC_MODELS


def get_model_metadata(model_key: str) -> dict:
    """Return enriched metadata for a model (units produced, engine, price, etc.)."""
    return _MODEL_METADATA.get(model_key, {})


def get_colour_desirability(model_key: str) -> dict[str, float]:
    """Return colour desirability scores for a model."""
    return _COLOUR_DESIRABILITY.get(model_key, {})


def get_enriched_spec(model_key: str) -> dict | None:
    """Return the full spec merged with metadata for LLM content generation."""
    spec = get_model_spec(model_key)
    if not spec:
        return None
    meta = get_model_metadata(model_key)
    return {**spec, **meta}
