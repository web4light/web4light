-- ============================================================
--  TROJČLENKA — Řídící centrum Web4
--  HTTP server na portu 3001
--  Přístup pouze z LAN (192.168.123.x)
--
--  Tři smyslové vrstvy:
--    VIDĚT  — dashboard metriky (Prometheus)
--    SLYŠET — audio stream status (Karel IV.)
--    MLUVIT — výstupní agenti (UTL, Asterisk)
--    VĚDĚT  — formálně ověřené fakty (SPARK)
--
--  Copyright (C) 2026 Pan Jeskyně
--  Rebirth Phoenix Foundation Charter
--  SOUKROMÉ — Nepublikovat, nesdílet
-- ============================================================

pragma SPARK_Mode (On);

package Trojclenka_Server with
   SPARK_Mode => On
is
   Port        : constant := 3001;
   Max_Clients : constant := 4;  -- jen LAN přístup

   subtype Port_Number is Natural range 1024 .. 65_535;
   subtype Client_Count is Natural range 0 .. Max_Clients;

   type Server_Status is (Stopped, Running, Error);

   type Server_State is record
      Status  : Server_Status := Stopped;
      Clients : Client_Count  := 0;
      Port    : Port_Number   := 3001;
   end record;

   -- Spustí HTTP server
   procedure Start (State : out Server_State)
     with Post => State.Status = Running or State.Status = Error;

   -- Zastaví HTTP server
   procedure Stop (State : in out Server_State)
     with Post => State.Status = Stopped;

   -- Vrátí stav serveru
   function Is_Running (State : Server_State) return Boolean is
     (State.Status = Running);

end Trojclenka_Server;
