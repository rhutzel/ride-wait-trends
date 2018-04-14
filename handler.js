'use strict';

const AWS = require('aws-sdk');
const moment = require('moment');
const parks = require('themeparks');

const extractWaits = (park, selectedRideNames) => {
	return new Promise((resolve, reject) => {
		const waits = {};

		// eslint-disable-next-line new-cap
		park.GetWaitTimes().then(rides => {
			selectedRideNames.forEach(selectedRideName => {
				const ride = rides.find(ride => ride.name === selectedRideName);
				if (ride) {
					waits[ride.name] = ride.waitTime;
				}
			});
			resolve(waits);
		}, err => {
			reject(err);
		});
	});
};

const compileDbRecord = parkWaitLists => {
	return {
		TableName: process.env.TABLE_NAME,
		Item: parkWaitLists.reduce((existing, parkWaitList) => Object.assign(existing, parkWaitList), {
			id: new Date().toISOString(),
			week: parseInt(moment().format('W'), 10),
			hourEastern: parseInt(moment().format('HH'), 10)
		})
	};
};

const retrieve = (event, context, callback) => {
	const dynamoDb = new AWS.DynamoDB.DocumentClient();

	Promise.all([
		extractWaits(new parks.Parks.WaltDisneyWorldMagicKingdom(), ['Splash Mountain', 'Space Mountain']),
		extractWaits(new parks.Parks.WaltDisneyWorldEpcot(), ['Test Track']),
		extractWaits(new parks.Parks.WaltDisneyWorldAnimalKingdom(), ['Avatar Flight of Passage']),
		extractWaits(new parks.Parks.UniversalStudiosFlorida(), ['Despicable Me Minion Mayhem™'])
	]).then(parkWaitLists => {
		dynamoDb.put(compileDbRecord(parkWaitLists), err => {
			if (err) {
				callback(null, {message: 'Persistence failed. ' + err, event});
			} else {
				callback(null, {message: 'Persisted wait times.', event});
			}
		});
	}, err => {
		callback(null, {message: 'Wait time retrieval failed. ' + err, event});
	});
};

module.exports = {
	retrieve,
	compileDbRecord,
	extractWaits
};
