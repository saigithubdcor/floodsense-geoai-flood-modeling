# Upload to GitHub

Target repository: https://github.com/saigithubdcor/floodsense-geoai-flood-modeling

1. Extract `FloodSense_GitHub_UPLOAD_READY_20261123.zip` on Windows.
2. Open the target GitHub repository in a browser. Choose **Add file → Upload files**.
3. Drag the **contents of the extracted folder** onto GitHub, keeping subdirectories. Do **not** upload the ZIP as a single GitHub file and do **not** upload the entire earlier R3 capture as the project's root tree.
4. Verify `portal_parent/app/`, `checkpoint/overrides/`, `docs/`, `provenance/`, and `third_party/` appear with their intended paths.
5. Review pending changes, use the commit message `Add verified V4.3.2 FloodSense UI source and documentation`, and commit.
6. Open `README.md` and check all its links. Confirm that the repository describes a **UI source snapshot**, not a standalone deployment.

For a shorter workflow, use the accompanying `FloodSense_GitHub_PUBLISH_ONE_GO.ps1` script, which has a preview mode and a separate explicit publish mode; it requires Git and configured GitHub credentials.
