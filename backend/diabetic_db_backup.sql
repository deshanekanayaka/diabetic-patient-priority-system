-- MySQL dump 10.13  Distrib 8.0.39, for macos14 (arm64)
--
-- Host: localhost    Database: diabetic_db
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clinicians`
--

DROP TABLE IF EXISTS `clinicians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clinicians` (
  `clinician_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`clinician_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clinicians`
--

LOCK TABLES `clinicians` WRITE;
/*!40000 ALTER TABLE `clinicians` DISABLE KEYS */;
INSERT INTO `clinicians` VALUES (1,'Sarah Johnson','sarah.johnson@clinic.com','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'),(2,'Michael Chen','michael.chen@clinic.com','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'),(3,'Emily Davis','emily.davis@clinic.com','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'),(4,'Test Clinician','test.clinician@clinic.com','$2b$10$OdF6gBddvuxgNTgWsSYmyuaD/VANGBsj4SJRdDwg5/KbDUPAQwONW');
/*!40000 ALTER TABLE `clinicians` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `patient_id` int NOT NULL AUTO_INCREMENT,
  `age` int NOT NULL,
  `sex` varchar(10) NOT NULL,
  `social_life` varchar(10) NOT NULL,
  `cholesterol` decimal(6,2) DEFAULT NULL,
  `triglycerides` decimal(6,2) DEFAULT NULL,
  `hdl` decimal(6,2) DEFAULT NULL,
  `ldl` decimal(6,2) DEFAULT NULL,
  `vldl` decimal(6,2) DEFAULT NULL,
  `bp_systolic` decimal(5,2) DEFAULT NULL,
  `bp_diastolic` decimal(5,2) DEFAULT NULL,
  `hba1c` decimal(4,2) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `rbs` decimal(6,2) DEFAULT NULL,
  `risk_score` decimal(5,2) DEFAULT NULL,
  `risk_category` varchar(10) DEFAULT NULL,
  `clinician_id` int NOT NULL,
  PRIMARY KEY (`patient_id`),
  KEY `clinician_id` (`clinician_id`),
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`clinician_id`) REFERENCES `clinicians` (`clinician_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (1,52,'male','city',238.00,195.00,36.00,155.00,39.00,148.00,93.00,8.10,30.80,172.00,82.40,'high',1),(3,60,'male','city',245.00,210.00,33.00,162.00,42.00,155.00,97.00,8.60,32.40,188.00,91.20,'high',2),(4,44,'female','village',192.00,140.00,48.00,115.00,28.00,128.00,83.00,6.40,25.60,118.00,54.70,'medium',2),(5,48,'male','city',205.00,158.00,42.00,122.00,31.00,132.00,86.00,6.80,27.30,128.00,61.90,'medium',3),(6,35,'female','village',172.00,108.00,58.00,92.00,21.00,118.00,77.00,5.40,23.10,98.00,28.30,'low',3),(8,40,'male','village',50.00,50.00,50.00,50.00,50.00,50.00,50.00,10.00,50.00,100.00,65.96,'medium',1),(10,30,'male','city',30.00,30.00,30.00,30.00,30.00,50.00,30.00,1.00,10.00,50.00,38.70,'low',1);
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-22 15:37:33
