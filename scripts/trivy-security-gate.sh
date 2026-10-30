
#!/usr/bin/env bash

set -Eeuo pipefail

# ==============================================
# Configuration
# ==============================================

: "${IMAGE_TO_SCAN:?IMAGE_TO_SCAN is required}"

NODE_LOCKFILE="${NODE_LOCKFILE:-pnpm-lock.yaml}"
TRIVY_VEX_FILE="${TRIVY_VEX_FILE:-.vex/trivy.openvex.json}"
TRIVY_REPORT_DIR="${TRIVY_REPORT_DIR:-trivy-reports}"

mkdir -p "$TRIVY_REPORT_DIR"

# ==============================================
# Validate inputs
# ==============================================

command -v trivy >/dev/null 2>&1 || {
    echo "ERROR: Trivy is not installed."
    exit 2
}

command -v docker >/dev/null 2>&1 || {
    echo "ERROR: Docker is not installed."
    exit 2
}

test -s "$TRIVY_VEX_FILE" || {
    echo "ERROR: VEX file not found."
    exit 2
}

test -f "$NODE_LOCKFILE" || {
    echo "ERROR: pnpm lockfile not found."
    exit 2
}

docker image inspect "$IMAGE_TO_SCAN" >/dev/null || {
    echo "ERROR: Docker image not found."
    exit 2
}

echo "======================================="
echo "Trivy Security Scan"
echo "======================================="
echo "Image: $IMAGE_TO_SCAN"
echo "Node lockfile: $NODE_LOCKFILE"
echo "VEX: $TRIVY_VEX_FILE"
echo "Blocking severity: CRITICAL"
echo "======================================="


# ==============================================
# 1. Full Image Report
# Informational; does not block deployment.
# Includes OS, libraries, Go and secrets.
# ==============================================

echo "=== Full Image Security Report ==="

trivy image \
    --scanners vuln,secret \
    --vex "$TRIVY_VEX_FILE" \
    --show-suppressed \
    --exit-code 0 \
    --format json \
    --output "$TRIVY_REPORT_DIR/full-image-report.json" \
    "$IMAGE_TO_SCAN"


# ==============================================
# 2. Node.js Dependency Report
# All severities, informational.
# ==============================================

echo "=== Node.js Dependency Report ==="

trivy fs \
    --scanners vuln \
    --pkg-types library \
    --vex "$TRIVY_VEX_FILE" \
    --show-suppressed \
    --exit-code 0 \
    --format json \
    --output "$TRIVY_REPORT_DIR/node-report.json" \
    "$NODE_LOCKFILE"


# ==============================================
# 3. Blocking Gate: Operating System
# CRITICAL only, with VEX applied.
# ==============================================

echo "=== OS CRITICAL Gate ==="

os_failed=0

if trivy image \
    --scanners vuln \
    --pkg-types os \
    --vex "$TRIVY_VEX_FILE" \
    --severity CRITICAL \
    --exit-code 1 \
    "$IMAGE_TO_SCAN"; then

    echo "PASS: No blocking CRITICAL OS findings."

else

    echo "FAIL: Critical OS vulnerability or scan error."
    os_failed=1

fi


# ==============================================
# 4. Blocking Gate: Node.js Libraries
# CRITICAL only, with VEX applied.
# ==============================================

echo "=== Node.js CRITICAL Gate ==="

node_failed=0

if trivy fs \
    --scanners vuln \
    --pkg-types library \
    --vex "$TRIVY_VEX_FILE" \
    --severity CRITICAL \
    --exit-code 1 \
    "$NODE_LOCKFILE"; then

    echo "PASS: No blocking CRITICAL Node.js findings."

else

    echo "FAIL: Critical Node.js vulnerability or scan error."
    node_failed=1

fi


# ==============================================
# 5. Final Decision
# ==============================================

echo "======================================="
echo "Security Gate Result"
echo "======================================="

if [ "$os_failed" -ne 0 ] || [ "$node_failed" -ne 0 ]; then

    echo "SECURITY GATE FAILED."
    echo "Production deployment is blocked."
    echo "Review the archived Trivy reports."

    exit 1

fi

echo "SECURITY GATE PASSED."
echo "No unsuppressed CRITICAL findings in the"
echo "selected OS and Node.js dependency scope."

exit 0
