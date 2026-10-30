
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)

        buildDiscarder(
            logRotator(
                numToKeepStr: '3',
                artifactNumToKeepStr: '3'
            )
        )

        timestamps()
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        APP_IMAGE = 'usd-site'
        APP_NAME = 'usd-site'

        // IMPORTANT: Replace with your real HTTPS domain.
        SITE_URL = 'https://YOUR_DOMAIN'

        HOST_PORT = '3000'
        BIND_IP = '127.0.0.1'

        DEPLOY_SUCCEEDED = 'false'
    }

    stages {

        stage('Checkout GitHub') {
            steps {
                checkout scm

                sh '''
                    set -eu

                    echo "=== Git Commit ==="
                    git rev-parse HEAD
                    git --no-pager log -1 --oneline

                    echo "=== Docker ==="
                    docker --version

                    echo "=== Trivy ==="
                    trivy --version
                '''
            }
        }

        stage('Validate Deployment Settings') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    set -eu

                    case "$SITE_URL" in
                        https://YOUR_DOMAIN|https://your_domain)
                            echo "ERROR: Set a real SITE_URL in Jenkinsfile."
                            exit 1
                            ;;
                        https://*)
                            echo "SITE_URL: $SITE_URL"
                            ;;
                        *)
                            echo "ERROR: SITE_URL must use HTTPS."
                            exit 1
                            ;;
                    esac

                    test -f Dockerfile
                    test -f server.mjs
                    test -f pnpm-lock.yaml
                    test -s .vex/trivy.openvex.json
                    test -f scripts/deploy-vps.sh
                    test -f scripts/trivy-security-gate.sh
                '''
            }
        }

        stage('Build Production Image') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    set -eu

                    docker build --pull \
                      --build-arg SITE_URL="$SITE_URL" \
                      --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
                      --label "ci.build-number=$BUILD_NUMBER" \
                      --tag "$APP_IMAGE:release-$BUILD_NUMBER" \
                      .
                '''
            }
        }

        stage('Trivy Security Gate') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    set -eu

                    IMAGE_TO_SCAN="$APP_IMAGE:release-$BUILD_NUMBER" \
                    NODE_LOCKFILE="pnpm-lock.yaml" \
                    TRIVY_VEX_FILE=".vex/trivy.openvex.json" \
                    TRIVY_REPORT_DIR="trivy-reports" \
                    bash scripts/trivy-security-gate.sh
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'trivy-reports/*.json',
                        allowEmptyArchive: true,
                        fingerprint: true
                    )
                }
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    set -eu

                    APP_IMAGE="$APP_IMAGE" \
                    APP_NAME="$APP_NAME" \
                    BUILD_NUMBER="$BUILD_NUMBER" \
                    HOST_PORT="$HOST_PORT" \
                    BIND_IP="$BIND_IP" \
                    bash scripts/deploy-vps.sh
                '''

                script {
                    env.DEPLOY_SUCCEEDED = 'true'
                }
            }
        }

        stage('Retain Last 3 Docker Releases') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    set -eu

                    docker image ls "$APP_IMAGE" \
                      --format '{{.Tag}}' \
                      | grep -E '^release-[0-9]+$' \
                      | sed 's/^release-//' \
                      | sort -nr \
                      | tail -n +4 \
                      | while IFS= read -r old; do
                          if [ -n "$old" ]; then
                            docker image rm \
                              "$APP_IMAGE:release-$old" || true
                          fi
                        done
                '''
            }
        }
    }

    post {
        always {
            script {
                if (env.DEPLOY_SUCCEEDED != 'true') {
                    sh '''
                        docker image rm \
                          "$APP_IMAGE:release-$BUILD_NUMBER" \
                          >/dev/null 2>&1 || true
                    '''
                }
            }

            deleteDir()
        }

        success {
            echo 'Pipeline completed successfully.'
            echo 'Production deployment verified.'
        }

        failure {
            echo 'Pipeline failed.'
            echo 'Check build, security gate or deployment logs.'
        }
    }
}
