"""
model_registry.py — Single Source of Truth for All Supported Car Models
========================================================================
Adding a new car model to the SupercarIQ platform requires ONE change:
add a ModelSpec entry to MODEL_REGISTRY below.

All downstream systems read from this registry:
  - specialist_dealer_scraper.py  — model gating (required/forbidden terms, year/price bounds)
  - discovery_scraper.py          — AutoTrader search URLs, Ferrari Approved slugs
  - detail_scraper.py             — scoring weights, IIV base prices, standard features
  - fa_playwright_scraper.py      — Ferrari/Lamborghini Approved scraper slugs
  - smart_pipeline.py             — which models to run each cycle

ModelSpec fields
----------------
key             : Unique slug used as DB modelKey (e.g. "812-superfast")
label           : Human-readable display name (e.g. "Ferrari 812 Superfast")
make            : Manufacturer name as used on AutoTrader (e.g. "Ferrari")
make_slug       : Lowercase manufacturer slug (e.g. "ferrari") — used for Romans, FA URLs
at_model        : AutoTrader model search string (e.g. "812 Superfast")
at_search_url   : Full AutoTrader search URL for this model
fa_slug         : Ferrari Approved / Lamborghini Approved URL slug (None if not applicable)
loa_search_url  : Lamborghini Approved search URL (None for non-Lamborghini)
year_min/max    : Production year range (inclusive) — hard gate
price_min/max   : Expected UK market price range in GBP — hard gate
required_terms  : ALL of these must appear in listing title/URL (case-insensitive, normalised)
forbidden_terms : ANY of these disqualifies the listing (case-insensitive, normalised)
url_hints       : URL path fragments that positively confirm a match (optional, used as bonus)
iiv_base        : IIV base price in GBP for scoring
iiv_range       : IIV ± range in GBP for confidence interval
standard_ccb    : True if carbon ceramic brakes are standard on this model
standard_lsd    : True if electronic LSD is standard
gpf_year        : Year from which GPF was fitted (None if no GPF concern)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ModelSpec:
    # Identity
    key: str
    label: str
    make: str                       # e.g. "Ferrari", "Lamborghini", "McLaren"
    make_slug: str                  # lowercase, e.g. "ferrari"

    # Discovery
    at_model: str                   # AutoTrader model search string
    at_search_url: str              # Full AutoTrader search URL
    fa_slug: Optional[str]          # Ferrari/Lamborghini Approved slug
    loa_search_url: Optional[str]   # Lamborghini Approved URL (non-Ferrari only)

    # Year / price hard gates
    year_min: int
    year_max: int
    price_min: int
    price_max: int

    # Keyword gating
    required_terms: list[str]       # ALL must appear in title+URL
    forbidden_terms: list[str]      # ANY disqualifies
    url_hints: list[str] = field(default_factory=list)  # positive URL fragments

    # Scoring / enrichment metadata
    iiv_base: int = 0
    iiv_range: int = 0
    standard_ccb: bool = False      # Carbon ceramic brakes standard?
    standard_lsd: bool = False      # Electronic LSD standard?
    gpf_year: Optional[int] = None  # Year GPF introduced (None = no GPF concern)
    low_mileage_threshold: int = 5000
    high_mileage_threshold: int = 25000


# ── Registry ──────────────────────────────────────────────────────────────────
# To add a new model: add one ModelSpec entry here.  Nothing else needs changing.

MODEL_REGISTRY: dict[str, ModelSpec] = {

    # ── Ferrari 812 Superfast ─────────────────────────────────────────────────
    "812-superfast": ModelSpec(
        key="812-superfast",
        label="Ferrari 812 Superfast",
        make="Ferrari",
        make_slug="ferrari",
        at_model="812 Superfast",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=812+Superfast"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="812-superfast",
        loa_search_url=None,
        year_min=2017, year_max=2023,
        price_min=180_000, price_max=700_000,
        required_terms=["812", "superfast"],
        forbidden_terms=["gts", "competizione", "aperta", "spider"],
        url_hints=["812-superfast", "812superfast"],
        iiv_base=235_000, iiv_range=50_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=2019,
        low_mileage_threshold=5_000, high_mileage_threshold=20_000,
    ),

    # ── Ferrari 812 GTS ───────────────────────────────────────────────────────
    "812-gts": ModelSpec(
        key="812-gts",
        label="Ferrari 812 GTS",
        make="Ferrari",
        make_slug="ferrari",
        at_model="812 GTS",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=812+GTS"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="812-gts",
        loa_search_url=None,
        year_min=2020, year_max=2024,
        price_min=280_000, price_max=900_000,
        required_terms=["812", "gts"],
        forbidden_terms=["superfast", "competizione", "aperta"],
        url_hints=["812-gts", "812gts"],
        iiv_base=380_000, iiv_range=70_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=2020,
        low_mileage_threshold=3_000, high_mileage_threshold=15_000,
    ),

    # ── Ferrari F8 Tributo ────────────────────────────────────────────────────
    "f8-tributo": ModelSpec(
        key="f8-tributo",
        label="Ferrari F8 Tributo",
        make="Ferrari",
        make_slug="ferrari",
        at_model="F8 Tributo",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=F8+Tributo"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="f8-tributo",
        loa_search_url=None,
        year_min=2019, year_max=2024,
        price_min=160_000, price_max=500_000,
        required_terms=["f8", "tributo"],
        forbidden_terms=["spider"],
        url_hints=["f8-tributo", "f8tributo"],
        iiv_base=220_000, iiv_range=60_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=2019,
        low_mileage_threshold=5_000, high_mileage_threshold=20_000,
    ),

    # ── Ferrari 488 Pista ─────────────────────────────────────────────────────
    "488-pista": ModelSpec(
        key="488-pista",
        label="Ferrari 488 Pista",
        make="Ferrari",
        make_slug="ferrari",
        at_model="488 Pista",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=488+Pista"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="488-pista",
        loa_search_url=None,
        year_min=2018, year_max=2020,
        price_min=280_000, price_max=700_000,
        required_terms=["488", "pista"],
        forbidden_terms=["spider"],
        url_hints=["488-pista", "488pista"],
        iiv_base=380_000, iiv_range=80_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=3_000, high_mileage_threshold=12_000,
    ),

    # ── Ferrari 488 GTB ───────────────────────────────────────────────────────
    "488-gtb": ModelSpec(
        key="488-gtb",
        label="Ferrari 488 GTB",
        make="Ferrari",
        make_slug="ferrari",
        at_model="488 GTB",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=488+GTB"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="488-gtb",
        loa_search_url=None,
        year_min=2015, year_max=2020,
        price_min=130_000, price_max=350_000,
        required_terms=["488", "gtb"],
        forbidden_terms=["spider", "pista"],
        url_hints=["488-gtb", "488gtb"],
        iiv_base=175_000, iiv_range=50_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=5_000, high_mileage_threshold=20_000,
    ),

    # ── Ferrari 458 Italia ────────────────────────────────────────────────────
    "458-italia": ModelSpec(
        key="458-italia",
        label="Ferrari 458 Italia",
        make="Ferrari",
        make_slug="ferrari",
        at_model="458 Italia",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=458+Italia"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="458-italia",
        loa_search_url=None,
        year_min=2009, year_max=2015,
        price_min=80_000, price_max=280_000,
        required_terms=["458", "italia"],
        forbidden_terms=["spider", "speciale", "aperta"],
        url_hints=["458-italia", "458italia"],
        iiv_base=130_000, iiv_range=40_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=10_000, high_mileage_threshold=30_000,
    ),

    # ── Ferrari SF90 Stradale ─────────────────────────────────────────────────
    "sf90-stradale": ModelSpec(
        key="sf90-stradale",
        label="Ferrari SF90 Stradale",
        make="Ferrari",
        make_slug="ferrari",
        at_model="SF90 Stradale",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=SF90+Stradale"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="sf90-stradale",
        loa_search_url=None,
        year_min=2020, year_max=2025,
        price_min=350_000, price_max=1_200_000,
        required_terms=["sf90"],
        forbidden_terms=["spider"],
        url_hints=["sf90-stradale", "sf90stradale"],
        iiv_base=480_000, iiv_range=120_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=2020,
        low_mileage_threshold=2_000, high_mileage_threshold=10_000,
    ),

    # ── Ferrari California T ──────────────────────────────────────────────────
    "california-t": ModelSpec(
        key="california-t",
        label="Ferrari California T",
        make="Ferrari",
        make_slug="ferrari",
        at_model="California T",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=California+T"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug=None,
        loa_search_url=None,
        year_min=2014, year_max=2018,
        price_min=60_000, price_max=200_000,
        required_terms=["california"],
        forbidden_terms=["handling speciale"],
        url_hints=["california-t"],
        iiv_base=90_000, iiv_range=25_000,
        standard_ccb=False, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=10_000, high_mileage_threshold=30_000,
    ),

    # ── Ferrari Portofino ─────────────────────────────────────────────────────
    "portofino": ModelSpec(
        key="portofino",
        label="Ferrari Portofino",
        make="Ferrari",
        make_slug="ferrari",
        at_model="Portofino",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=Portofino"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="portofino",
        loa_search_url=None,
        year_min=2017, year_max=2023,
        price_min=100_000, price_max=280_000,
        required_terms=["portofino"],
        forbidden_terms=[],
        url_hints=["portofino"],
        iiv_base=110_000, iiv_range=30_000,
        standard_ccb=False, standard_lsd=True,
        gpf_year=2019,
        low_mileage_threshold=5_000, high_mileage_threshold=25_000,
    ),

    # ── Ferrari Roma ──────────────────────────────────────────────────────────
    "roma": ModelSpec(
        key="roma",
        label="Ferrari Roma",
        make="Ferrari",
        make_slug="ferrari",
        at_model="Roma",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Ferrari&model=Roma"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug="roma",
        loa_search_url=None,
        year_min=2020, year_max=2025,
        price_min=150_000, price_max=400_000,
        # Must include "ferrari" to avoid matching "Roma" as a city name
        required_terms=["ferrari", "roma"],
        forbidden_terms=["spider"],
        url_hints=["ferrari-roma", "ferrari/roma"],
        iiv_base=180_000, iiv_range=40_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=2020,
        low_mileage_threshold=3_000, high_mileage_threshold=15_000,
    ),

    # ── Lamborghini Huracán STO ───────────────────────────────────────────────
    "huracan-sto": ModelSpec(
        key="huracan-sto",
        label="Lamborghini Huracán STO",
        make="Lamborghini",
        make_slug="lamborghini",
        at_model="Huracan",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Lamborghini&model=Huracan"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
            "&year-from=2021&year-to=2024"
        ),
        fa_slug=None,
        loa_search_url=(
            "https://www.lamborghini.com/en-EN/certified-pre-owned"
            "?model=huracan-sto&country=GB"
        ),
        year_min=2021, year_max=2025,
        price_min=250_000, price_max=700_000,
        required_terms=["huracan", "sto"],
        forbidden_terms=["evo", "performante", "tecnica", "lp610", "lp580", "spyder"],
        url_hints=["huracan-sto", "huracan/sto"],
        iiv_base=340_000, iiv_range=80_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=2_000, high_mileage_threshold=10_000,
    ),

    # ── McLaren 720S ──────────────────────────────────────────────────────────
    # (Placeholder — activate when McLaren page is launched)
    "720s": ModelSpec(
        key="720s",
        label="McLaren 720S",
        make="McLaren",
        make_slug="mclaren",
        at_model="720S",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=McLaren&model=720S"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug=None,
        loa_search_url=None,
        year_min=2017, year_max=2023,
        price_min=120_000, price_max=450_000,
        required_terms=["720s"],
        forbidden_terms=["spider", "gt", "765lt"],
        url_hints=["720s", "720-s"],
        iiv_base=160_000, iiv_range=50_000,
        standard_ccb=True, standard_lsd=False,
        gpf_year=None,
        low_mileage_threshold=5_000, high_mileage_threshold=25_000,
    ),

    # ── McLaren 765LT ─────────────────────────────────────────────────────────
    "765lt": ModelSpec(
        key="765lt",
        label="McLaren 765LT",
        make="McLaren",
        make_slug="mclaren",
        at_model="765LT",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=McLaren&model=765LT"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug=None,
        loa_search_url=None,
        year_min=2020, year_max=2022,
        price_min=280_000, price_max=700_000,
        required_terms=["765lt"],
        forbidden_terms=["spider"],
        url_hints=["765lt", "765-lt"],
        iiv_base=380_000, iiv_range=80_000,
        standard_ccb=True, standard_lsd=False,
        gpf_year=None,
        low_mileage_threshold=2_000, high_mileage_threshold=8_000,
    ),

    # ── Porsche 911 GT3 (992) ─────────────────────────────────────────────────
    "911-gt3-992": ModelSpec(
        key="911-gt3-992",
        label="Porsche 911 GT3 (992)",
        make="Porsche",
        make_slug="porsche",
        at_model="911 GT3",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Porsche&model=911+GT3"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
            "&year-from=2021"
        ),
        fa_slug=None,
        loa_search_url=None,
        year_min=2021, year_max=2025,
        price_min=150_000, price_max=450_000,
        required_terms=["911", "gt3"],
        forbidden_terms=["rs", "touring", "cup", "gt3 r", "991"],
        url_hints=["911-gt3", "gt3-992"],
        iiv_base=200_000, iiv_range=50_000,
        standard_ccb=True, standard_lsd=True,
        gpf_year=None,
        low_mileage_threshold=3_000, high_mileage_threshold=15_000,
    ),

    # ── Aston Martin DBS Superleggera ─────────────────────────────────────────
    "dbs-superleggera": ModelSpec(
        key="dbs-superleggera",
        label="Aston Martin DBS Superleggera",
        make="Aston Martin",
        make_slug="aston-martin",
        at_model="DBS Superleggera",
        at_search_url=(
            "https://www.autotrader.co.uk/car-search?make=Aston+Martin&model=DBS+Superleggera"
            "&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc"
        ),
        fa_slug=None,
        loa_search_url=None,
        year_min=2018, year_max=2023,
        price_min=120_000, price_max=400_000,
        required_terms=["dbs", "superleggera"],
        forbidden_terms=["volante"],
        url_hints=["dbs-superleggera"],
        iiv_base=160_000, iiv_range=50_000,
        standard_ccb=True, standard_lsd=False,
        gpf_year=None,
        low_mileage_threshold=5_000, high_mileage_threshold=25_000,
    ),
}


# ── Convenience helpers ───────────────────────────────────────────────────────

def get_model(model_key: str) -> Optional[ModelSpec]:
    """Return the ModelSpec for a given key, or None."""
    return MODEL_REGISTRY.get(model_key)


def get_all_models() -> list[ModelSpec]:
    """Return all registered models as a list."""
    return list(MODEL_REGISTRY.values())


def get_models_by_make(make: str) -> list[ModelSpec]:
    """Return all models for a given manufacturer (case-insensitive)."""
    make_lower = make.lower()
    return [m for m in MODEL_REGISTRY.values() if m.make.lower() == make_lower]


def get_active_models() -> list[ModelSpec]:
    """
    Return models that are currently active on the platform.
    Currently all models are active; this hook allows future selective activation.
    """
    return get_all_models()


def model_keys_for_make(make_slug: str) -> list[str]:
    """Return model keys for a given make slug (e.g. 'ferrari')."""
    return [m.key for m in MODEL_REGISTRY.values() if m.make_slug == make_slug]


if __name__ == "__main__":
    print(f"{'Key':<20} {'Label':<35} {'Make':<15} {'Years':<12} {'Price Range'}")
    print("-" * 100)
    for key, spec in MODEL_REGISTRY.items():
        price_range = f"£{spec.price_min//1000}k–£{spec.price_max//1000}k"
        year_range = f"{spec.year_min}–{spec.year_max}"
        print(f"{key:<20} {spec.label:<35} {spec.make:<15} {year_range:<12} {price_range}")
    print(f"\nTotal: {len(MODEL_REGISTRY)} models across {len(set(m.make for m in MODEL_REGISTRY.values()))} manufacturers")
