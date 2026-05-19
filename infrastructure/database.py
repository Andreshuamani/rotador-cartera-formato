# -*- coding: utf-8 -*-
"""
MÓDULO DE CONFIGURACIÓN Y CONEXIÓN A POSTGRESQL
Este script lee las credenciales del archivo .env situado en la raíz del proyecto.
"""

import os

import psycopg2
from dotenv import load_dotenv

# Localizar el archivo .env un nivel arriba de la carpeta actual (infrastructure/)
ruta_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=ruta_env)

# Control de ambiente seguro (Por defecto False -> Conecta a Réplica)
AMBIENTE_PRODUCCION = os.getenv("AMBIENTE_PRODUCCION", "False").lower() in (
    "true",
    "1",
    "yes",
)


def obtener_conexion():
    """
    Devuelve un objeto de conexión activo hacia la base de datos correspondiente.
    """
    try:
        if AMBIENTE_PRODUCCION:
            print(
                "[INFO] Conectando de manera segura a: postgres://PRODUCCIÓN (100.10)"
            )
            conn = psycopg2.connect(
                host=os.getenv("DB_PROD_HOST"),
                port=os.getenv("DB_PROD_PORT"),
                database=os.getenv("DB_PROD_NAME"),
                user=os.getenv("DB_PROD_USER"),
                password=os.getenv("DB_PROD_PASSWORD"),
            )
        else:
            print("[INFO] Conectando de manera segura a: postgres://RÉPLICA (100.220)")
            conn = psycopg2.connect(
                host=os.getenv("DB_REPLICA_HOST"),
                port=os.getenv("DB_REPLICA_PORT"),
                database=os.getenv("DB_REPLICA_NAME"),
                user=os.getenv("DB_REPLICA_USER"),
                password=os.getenv("DB_REPLICA_PASSWORD"),
            )
        return conn
    except psycopg2.DatabaseError as e:
        print(f"[ERROR CRÍTICO] Error al conectar a la base de datos: {e}")
        raise e


if __name__ == "__main__":
    # Prueba rápida de conexión
    print("--- Diagnóstico de Conexión ---")
    print(f"¿Modo Producción Activo?: {AMBIENTE_PRODUCCION}")
    try:
        conexion = obtener_conexion()
        print("✅ Conexión establecida con éxito.")
        conexion.close()
        print("🔒 Conexión cerrada de forma segura.")
    except Exception:
        print("❌ La prueba de conexión ha fallado.")
