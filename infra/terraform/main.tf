terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

variable "gcp_project_id" {
  type    = string
  default = "veriscope-prod"
}

variable "gcp_region" {
  type    = string
  default = "asia-south1"
}

# GKE Cluster with Horizontal Autoscaling
resource "google_container_cluster" "primary" {
  name     = "veriscope-gke-cluster"
  location = var.gcp_region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = "default"
  subnetwork = "default"

  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "veriscope-node-pool"
  location   = var.gcp_region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }
}

# Cloud SQL PostgreSQL 16 (with pgvector support)
resource "google_sql_database_instance" "postgres" {
  name             = "veriscope-pg-instance"
  database_version = "POSTGRES_16"
  region           = var.gcp_region

  settings {
    tier = "db-custom-4-16384"
    ip_configuration {
      ipv4_enabled = true
    }
    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }
  }
}

# Redis Memorystore (Message Bus & Rate Limiting)
resource "google_redis_instance" "redis_bus" {
  name           = "veriscope-redis-bus"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.gcp_region
  redis_version  = "REDIS_7_0"
}
