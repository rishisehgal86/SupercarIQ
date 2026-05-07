CREATE TABLE `negotiationBriefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`carId` int NOT NULL,
	`carModel` varchar(64) NOT NULL,
	`s3Key` varchar(512),
	`s3Url` varchar(1024),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `negotiationBriefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`carId` int NOT NULL,
	`carModel` varchar(64) NOT NULL,
	`askingPrice` int NOT NULL,
	`iiv` int NOT NULL,
	`priceVariance` int NOT NULL,
	`snapshotDate` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	CONSTRAINT `priceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`carId` int NOT NULL,
	`carModel` varchar(64) NOT NULL,
	`askingPriceAtAdd` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
