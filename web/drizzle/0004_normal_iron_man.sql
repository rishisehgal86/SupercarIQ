CREATE TABLE `report_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`modelKey` varchar(64) NOT NULL,
	`modelLabel` varchar(128) NOT NULL,
	`source` varchar(64) DEFAULT 'report-gate',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_leads_id` PRIMARY KEY(`id`)
);
