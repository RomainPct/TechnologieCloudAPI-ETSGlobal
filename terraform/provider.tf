# Config terraform
terraform {
  required_providers {
    heroku = {
      source = "heroku/heroku"
      version = "3.2.0"
    }
  }
}
provider "heroku" {
    email = "tellusofficieltv@gmail.com"
    api_key = "f107daaa-1a1c-47c1-bd6b-6c622666b4ad"
}

# Production ressources
resource "heroku_app" "app_production" {
  name   = "api-etsglobal-production"
  region = "eu"
}

resource "heroku_addon" "database_production" {
  app  = heroku_app.app_production.name
  plan = "heroku-postgresql:hobby-dev"
}

# Staging ressources
resource "heroku_app" "app_staging" {
  name   = "api-etsglobal-staging"
  region = "eu"
}

resource "heroku_addon" "database_staging" {
  app  = heroku_app.app_staging.name
  plan = "heroku-postgresql:hobby-dev"
}

# Create a Heroku pipeline
resource "heroku_pipeline" "api-etsglobal-app" {
  name = "api-etsglobal-app"
}

# Couple apps to different pipeline stages
resource "heroku_pipeline_coupling" "staging" {
  app      = heroku_app.app_staging.name
  pipeline = heroku_pipeline.api-etsglobal-app.id
  stage    = "staging"
}

resource "heroku_pipeline_coupling" "production" {
  app      = heroku_app.app_production.name
  pipeline = heroku_pipeline.api-etsglobal-app.id
  stage    = "production"
}