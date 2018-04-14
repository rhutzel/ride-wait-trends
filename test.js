import test from 'ava';
import sinon from 'sinon';
import AWS from 'aws-sdk-mock';
import moment from 'moment';
import parks from 'themeparks';
import handler from './handler';

process.env.TABLE_NAME = 'TEST_TABLE';

const TEST_PARK = {
	GetWaitTimes: sinon.stub().resolves([
		{name: 'TEST_RIDE_1', waitTime: 100},
		{name: 'TEST_RIDE_2', waitTime: 200}
	])
};

const TEST_FAILING_PARK = {
	GetWaitTimes: sinon.stub().rejects()
};

test.before(() => {
	sinon.stub(parks.Parks, 'WaltDisneyWorldMagicKingdom').returns(TEST_PARK);
	sinon.stub(parks.Parks, 'WaltDisneyWorldEpcot').returns(TEST_PARK);
	sinon.stub(parks.Parks, 'WaltDisneyWorldAnimalKingdom').returns(TEST_PARK);
	sinon.stub(parks.Parks, 'UniversalStudiosFlorida').returns(TEST_PARK);

	AWS.mock('DynamoDB.DocumentClient', 'put', (data, callback) => {
		callback(null);
	});
});

test('extract promised wait times from park', async t => {
	await handler.extractWaits(TEST_PARK, ['TEST_RIDE_2', 'TEST_RIDE_FAKE']).then(result => {
		t.is(Object.keys(result).length, 1);
		t.is(result.TEST_RIDE_2, 200);
	});
});

test('merges wait lists into a complete database record', t => {
	const testWaitLists = [
		{TEST_RIDE_1: 1, TEST_RIDE_2: 2},
		{TEST_RIDE_3: 3, TEST_RIDE_4: 4}
	];

	const expectedWeek = parseInt(moment().format('W'), 10);
	const expectedHourEastern = parseInt(moment().format('HH'), 10);
	const result = handler.compileDbRecord(testWaitLists);

	t.is(result.TableName, 'TEST_TABLE');
	t.is(result.Item.week, expectedWeek);
	t.is(result.Item.hourEastern, expectedHourEastern);
	t.is(result.Item.TEST_RIDE_1, 1);
	t.is(result.Item.TEST_RIDE_2, 2);
	t.is(result.Item.TEST_RIDE_3, 3);
	t.is(result.Item.TEST_RIDE_4, 4);
});

test.serial.cb('retrieve persists when all park promises resolve', t => {
	handler.retrieve(null, null, (params, body) => {
		t.true(body.message.indexOf('Persisted') >= 0);
		t.end();
	});
});

test.serial.cb('retrieve reports error when any park rejects', t => {
	parks.Parks.UniversalStudiosFlorida.restore();
	sinon.stub(parks.Parks, 'UniversalStudiosFlorida').returns(TEST_FAILING_PARK);

	handler.retrieve(null, null, (params, body) => {
		t.true(body.message.indexOf('failed') >= 0);

		// Repair dependency.
		parks.Parks.UniversalStudiosFlorida.restore();
		sinon.stub(parks.Parks, 'UniversalStudiosFlorida').returns(TEST_PARK);

		t.end();
	});
});

test.serial.cb('retrieve reports error when persistence fails', t => {
	AWS.restore('DynamoDB.DocumentClient');
	AWS.mock('DynamoDB.DocumentClient', 'put', (data, callback) => {
		callback('ERROR');
	});

	handler.retrieve(null, null, (params, body) => {
		t.true(body.message.indexOf('Persistence failed') >= 0);

		// Repair dependency.
		AWS.restore('DynamoDB.DocumentClient');
		AWS.mock('DynamoDB.DocumentClient', 'put', (data, callback) => {
			callback(null);
		});

		t.end();
	});
});

