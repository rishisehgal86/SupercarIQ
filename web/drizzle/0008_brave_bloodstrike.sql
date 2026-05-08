ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `magnetorheologicalSuspension` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `rearWheelSteering` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `trackPack` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `limitedEdition` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `seats` varchar(32);--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `warrantyExpiry` varchar(64);--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `dealerLocation` varchar(256);--> statement-breakpoint
ALTER TABLE `car_listing_details` ADD `thumbnailUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);