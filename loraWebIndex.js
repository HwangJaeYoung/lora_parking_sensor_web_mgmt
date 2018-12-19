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

var retreiveExecution = function (containerName, callBackResponse) {

    var targetURL = "http://203.253.128.161:7579/Mobius/iotParking/parkingSpot/" + containerName + "/status" + "/la";
    console.log(targetURL);

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
            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};


// Server testing code
loraWebIndex.get('/localLoraSensorsCollector', function (request, response) {
    console.log("in ajax function")

    for(var i = 1; i < 136; i++) {

        async.waterfall([
            function() {

                var containerName;

                if(i < 10) {
                    containerName = "KETI00" + i;
                } else if (i < 100) {
                    containerName = "KETI0" + i;
                } else {
                    containerName = "KETI" + i;
                }

                retreiveExecution(containerName, function (statusCode) {
                    if(statusCode == 200) {
                        return;
                    }
                });
            },
        ], function (statusCode, result) {
            if(statusCode) {
            }
        }); // End of async.waterfall
    }

    response.send('<h1>'+ 'Context-Aware auxiliary component' + '</h1>');
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