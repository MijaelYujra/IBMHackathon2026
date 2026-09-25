########################################################
# Infraestructura de ejemplo para el demo de Drift Detector
# Nota: para el hackathon esto es un target ILUSTRATIVO.
# No hace falta aplicarlo a un cloud real: el MCP server lee
# los recursos "declarados" desde infra/declared-state.json,
# que representa lo que ESTE archivo dice que debería existir.
# En una v2 real, ese JSON se generaría con:
#   terraform show -json terraform.tfstate > declared-state.json
########################################################

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "drift-demo-vpc"
  }
}

# SECURITY FIX — 2025-09-25
# Drift detectado: regla SSH (port 22, 0.0.0.0/0) fue agregada manualmente
# en la consola de AWS sin pasar por este codigo (IaC).
# Riesgo: exposicion de SSH a Internet completo (CVSS critico).
# Correccion: este archivo es la fuente de verdad. Solo HTTPS (443) esta permitido.
# Aplicar con: terraform apply  (requiere aprobacion del equipo de seguridad)
# NUNCA agregar ingress SSH con cidr_blocks = ["0.0.0.0/0"]. Usar AWS SSM Session
# Manager para acceso operacional sin abrir puertos.
resource "aws_security_group" "app_sg" {
  name        = "drift-demo-app-sg"
  description = "Security group de la app - reglas minimas declaradas"
  vpc_id      = aws_vpc.main.id

  # Unica regla de ingreso autorizada: HTTPS desde Internet.
  # SSH (port 22) esta EXPLICITAMENTE PROHIBIDO en este security group.
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
