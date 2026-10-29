pipeline {
    agent any

    options {
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

    // Fallback polling. A GitHub webhook is faster.
    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        APP_IMAGE = 'usd-site'
        APP_NAME = 'usd-site'

        // Replace with your actual HTTPS domain.
        SITE_URL = 'https://YOUR_DOMAIN'

        HOST_PORT = '3000'
        BIND_IP = '127.0.0.1'

        DEPLOY_SUCCEEDED = 'false'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    git rev-parse HEAD
                    git --no-pager log -1 --oneline
                    docker --version
                    trivy --version
                '''
            }
        }

        stage('Code Quality and Dependency Audit') {
            steps {
                sh '''
                    docker build --pull \
                      --target ci \
                      --tag "$APP_IMAGE:ci-$BUILD_NUMBER" \
                      .
                '''
            }
        }

        stage('Build Production Image') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    docker build --pull \
                      --build-arg SITE_URL="$SITE_URL" \
                      --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
                      --label "ci.build-number=$BUILD_NUMBER" \
                      --tag "$APP_IMAGE:release-$BUILD_NUMBER" \
                      .
                '''
            }
        }

        stage('Docker Image Security Scan') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    trivy image \
                      --ignore-unfixed \
                      --exit-code 1 \
                      --severity HIGH,CRITICAL \
                      "$APP_IMAGE:release-$BUILD_NUMBER"
                '''
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }

            steps {
                sh '''
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
                    docker image ls "$APP_IMAGE" \
                      --format '{{.Tag}}' \
                      | grep -E '^release-[0-9]+$' \
                      | sed 's/^release-//' \
                      | sort -nr \
                      | tail -n +4 \
                      | while IFS= read -r old; do
                          [ -n "$old" ] && \
                            docker image rm "$APP_IMAGE:release-$old" \
                            || true
                        done
                '''
            }
        }
    }

    post {
        always {
            script {
                // Failed candidates must not displace rollback releases.
                if (env.DEPLOY_SUCCEEDED != 'true') {
                    sh '''
                        docker image rm \
                          "$APP_IMAGE:release-$BUILD_NUMBER" \
                          >/dev/null 2>&1 || true
                    '''
                }
            }

            sh '''
                docker image rm \
                  "$APP_IMAGE:ci-$BUILD_NUMBER" \
                  >/dev/null 2>&1 || true
            '''

            deleteDir()
        }

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check logs and rollback status.'
        }
    }
}
