/**
 * Created by JaeYoungHwang on 2017-01-11.
 */

var fs = require('fs');
var ejs = require('ejs');
var http = require('http');
var async = require('async');
var express = require('express');
var bodyParser = require('body-parser');
var requestToServer = require('request');

var loraWebIndex = express();
loraWebIndex.use(bodyParser.json());
loraWebIndex.use(bodyParser.urlencoded({extended: false}));
loraWebIndex.use(express.static('ajax'));
loraWebIndex.use(express.static('bootstrap'));
loraWebIndex.use(express.static('pages'));
loraWebIndex.use(express.static('scripts'));
loraWebIndex.use(express.static('styles'));

var requestToAnotherServer = require('request');

var retreiveExecution = function (containerName, loraStatusArray, callBackResponse) {

    var targetURL = "http://203.253.128.161:7579/Mobius/iotParking/parkingSpot/" + containerName + "/status" + "/la";

    requestToAnotherServer({
        url: targetURL,
        method: 'GET',
        json: true,
        headers: { // Basic AE resource structure for registration
            'Accept': 'application/json',
            'X-M2M-RI': '12345',
            'X-M2M-Origin': 'Origin',
        }
    }, function (error, oneM2MResponse, body) {
        if(typeof(oneM2MResponse) !== 'undefined') {
            var root = oneM2MResponse.body;
            var contentInstance = root['m2m:cin'];
            var creationTime = contentInstance['ct'];
            console.log(containerName + " : " + creationTime);

            var loraSensorName = "loraSensor" + containerName;

            var tempJSONObject = new Object();
            tempJSONObject.deviceName = loraSensorName;
            tempJSONObject.creationTime = creationTime;
            loraStatusArray.push(tempJSONObject);

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};


// Server testing code
loraWebIndex.get('/localLoraSensorsCollector', function (request, response) {

    var loraStatusArray = new Array();
    var iterationCount = 1;

    async.whilst(
        function() {
            return iterationCount < 136
        },

        function (async_for_loop_callback) {
            var containerName;

            if(iterationCount < 10) {
                containerName = "KETI00" + iterationCount;
            } else if (iterationCount < 100) {
                containerName = "KETI0" + iterationCount;
            } else {
                containerName = "KETI" + iterationCount;
            }

            retreiveExecution(containerName, loraStatusArray, function (statusCode) {
                if(statusCode == 200) {
                    iterationCount++;
                    async_for_loop_callback (null, iterationCount);
                } else {
                    console.log("This condition is going to be covered later");
                }
            });
        },

        function (err, n) {
            var loraSensorJSONObject = new Object();
            loraSensorJSONObject.loraSensorsList = loraStatusArray;
            response.status(200).send(loraSensorJSONObject);
        }
    );
});


// Connecting the oneM2M Web Tester page.
loraWebIndex.get('/loraWebHome', function (request, response) {
    fs.readFile('loraWebHome.ejs', 'utf-8', function (error, data) {
        response.status(200).end(ejs.render(data));
    });
});

// Server start
http.createServer(loraWebIndex).listen(62590, function () {
    console.log('Server running port at ' + 'http://127.0.0.1:62590');
});