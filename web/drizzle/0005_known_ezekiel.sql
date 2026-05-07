CREATE TABLE `pipeline_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runType` varchar(32) NOT NULL DEFAULT 'scheduled',
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`newListingsFound` smallint NOT NULL DEFAULT 0,
	`listingsEnriched` smallint NOT NULL DEFAULT 0,
	`listingsMarkedSold` smallint NOT NULL DEFAULT 0,
	`queueDepth` smallint NOT NULL DEFAULT 0,
	`modelsScanned` json,
	`errorMessage` text,
	`durationSeconds` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `pipeline_runs_id` PRIMARY KEY(`id`)
);
