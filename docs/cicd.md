# CI/CD Pipeline

This document outlines the CI/CD pipeline for the Architech frontend application, configured using GitHub Actions.

## Workflow Structure

The CI/CD pipeline is defined in the `.github/workflows/new-frontend-ci.yml` file. It is triggered on every push to the `main` and `fix/ci-test-script` branches, and on every pull request to the `main` branch.

The pipeline consists of the following jobs:

-   `test`: This job runs the test suite, which includes type checking, linting, and unit tests.
-   `docker-build`: This job builds the Docker image for the frontend application and pushes it to the GitHub Container Registry.
-   `e2e-tests`: This job runs the end-to-end tests using Playwright.
-   `deploy-staging`: This job deploys the application to the staging environment.
-   `deploy-production`: This job deploys the application to the production environment.
-   `security-scan`: This job runs a security scan using Trivy and uploads the results to the GitHub Security tab.

## Docker Build and Image Publishing

The `docker-build` job builds the Docker image for the frontend application and pushes it to the GitHub Container Registry. The image is tagged with the branch name, the pull request number, and the commit SHA.

The Docker build process is defined in the `Dockerfile`. It uses a multi-stage build to create a small, optimized image.

## Security Scans

The `security-scan` job runs a security scan using Trivy. Trivy is a simple and comprehensive vulnerability scanner for containers and other artifacts.

The job is configured to scan the filesystem of the repository for vulnerabilities. The results of the scan are uploaded to the GitHub Security tab, where they can be viewed and managed.

## Merging Frontend and Backend CI/CD Workflows

When migrating to a monorepo, the frontend and backend CI/CD workflows will need to be merged into a single workflow.

The merged workflow should be structured in a modular way, with separate jobs for the frontend and backend applications. The jobs should be configured to only run when there are changes in the corresponding application directory.

The following is an example of how the merged workflow could be structured:

```yaml
jobs:
  frontend-test:
    if: startsWith(github.ref, 'refs/heads/fix/') || (github.event_name == 'pull_request' && startsWith(github.head_ref, 'fix/'))
    paths:
      - 'apps/frontend/**'
    ...

  backend-test:
    if: startsWith(github.ref, 'refs/heads/fix/') || (github.event_name == 'pull_request' && startsWith(github.head_ref, 'fix/'))
    paths:
      - 'apps/backend/**'
    ...

  deploy-staging:
    needs: [frontend-test, backend-test]
    if: github.ref == 'refs/heads/develop'
    ...

  deploy-production:
    needs: [frontend-test, backend-test]
    if: github.ref == 'refs/heads/main'
    ...
```

This workflow uses the `paths` filter to only run the `frontend-test` and `backend-test` jobs when there are changes in the `apps/frontend` and `apps/backend` directories, respectively.

The `deploy-staging` and `deploy-production` jobs are configured to run after the `frontend-test` and `backend-test` jobs have completed successfully.
