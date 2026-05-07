ALTER TABLE `negotiationBriefs` MODIFY COLUMN `carId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `priceHistory` MODIFY COLUMN `carId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `watchlist` MODIFY COLUMN `carId` varchar(64) NOT NULL;