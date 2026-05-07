CREATE TABLE `car_listing_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` varchar(64) NOT NULL,
	`iiv` int,
	`iivLow` int,
	`iivHigh` int,
	`priceVariance` int,
	`priceVariancePct` float,
	`totalScore` float,
	`rank` int,
	`investmentVerdict` varchar(32),
	`gpfStatus` varchar(16),
	`interior` varchar(128),
	`dealer` varchar(256),
	`dealerType` varchar(32),
	`ownerCount` smallint,
	`serviceHistory` varchar(64),
	`accidentHistory` boolean DEFAULT false,
	`carbonPack` boolean DEFAULT false,
	`ccb` boolean DEFAULT false,
	`suspensionLift` boolean DEFAULT false,
	`atelierCar` boolean DEFAULT false,
	`dataConfidence` varchar(16) DEFAULT 'estimated',
	`equipmentJson` json,
	`imagesJson` json,
	`scoresJson` json,
	`keyStrengths` json,
	`keyWeaknesses` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `car_listing_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `car_listing_details_listingId_unique` UNIQUE(`listingId`)
);
--> statement-breakpoint
CREATE TABLE `car_listings` (
	`id` varchar(64) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`modelKey` varchar(64) NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'autotrader',
	`status` enum('active','pending_sold','sold') NOT NULL DEFAULT 'active',
	`askingPrice` int NOT NULL,
	`year` smallint,
	`colour` varchar(128),
	`mileage` int,
	`firstSeenDate` date NOT NULL,
	`lastSeenDate` date NOT NULL,
	`soldDate` date,
	`consecutiveAbsentDays` smallint NOT NULL DEFAULT 0,
	`daysOnMarket` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `car_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `car_price_snapshots_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` varchar(64) NOT NULL,
	`price` int NOT NULL,
	`changeAmount` int DEFAULT 0,
	`recordedDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `car_price_snapshots_v2_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelKey` varchar(64) NOT NULL,
	`statDate` date NOT NULL,
	`activeCount` smallint NOT NULL DEFAULT 0,
	`avgPrice` int,
	`medianPrice` int,
	`minPrice` int,
	`maxPrice` int,
	`newListings` smallint NOT NULL DEFAULT 0,
	`soldCount` smallint NOT NULL DEFAULT 0,
	`avgDaysOnMarket` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_daily_stats_id` PRIMARY KEY(`id`)
);
