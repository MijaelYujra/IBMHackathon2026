terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "demo-access-key"
  secret_key                  = "demo-secret-key"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_region_validation      = true
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "drift-demo-vpc"
  }
}

resource "aws_security_group" "app_sg" {
  name        = "drift-demo-app-sg"
  description = "Security group de la app - reglas minimas declaradas"
  vpc_id      = aws_vpc.main.id

  # Solo HTTPS entrante, nada mas
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "drift-demo-app-sg"
  }
}

resource "aws_s3_bucket" "data" {
  bucket = "drift-demo-data-bucket"

  tags = {
    Name        = "drift-demo-data-bucket"
    Environment = "hackathon-demo"
  }
}

resource "aws_s3_bucket_public_access_block" "data_block" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_instance" "app_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name = "drift-demo-app-server"
  }
}
