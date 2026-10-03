# Stitch integration

Portal RYM uses the official @google/stitch-sdk from this folder.

The repository secret STITCH_API_KEY is expected to be configured in GitHub Actions.

The intended flow is:
Stitch project -> screen catalog -> exported HTML/screenshots -> .stitch/ -> Vue implementation.

Runtime data continues to come from the existing Portal RYM services and Supabase. Stitch is a design source only.
