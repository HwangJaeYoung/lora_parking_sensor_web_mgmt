/**
 * Created by JaeYoungHwang on 2017-01-11.
 */

var fs = require('fs');
var ejs = require('ejs');
var http = require('http');
var async = require('async');
var express = require('express');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var requestToServer = require('request');

require('date-utils');
require('dotenv').config();

var loraWebIndex = express();
loraWebIndex.use(bodyParser.json());
loraWebIndex.use(bodyParser.urlencoded({extended: false}));
loraWebIndex.use(express.static('ajax'));
loraWebIndex.use(express.static('bootstrap'));
loraWebIndex.use(express.static('bootstrap_cover'));
loraWebIndex.use(express.static('pages'));
loraWebIndex.use(express.static('scripts'));
loraWebIndex.use(express.static('styles'));
loraWebIndex.use(express.static('images'));
loraWebIndex.use(express.static('MDBChartLib'));

var requestToAnotherServer = require('request');

var retreiveExecutionForStatus = function (containerName, loraStatusArray, callBackResponse) {

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
            // console.log(containerName + " : " + creationTime);

            console.log(creationTime);

            var loraSensorName = containerName;

            var tempJSONObject = new Object();
            tempJSONObject.deviceName = loraSensorName;
            tempJSONObject.creationTime = creationTime;
            loraStatusArray.push(tempJSONObject);

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};

var retreiveExecutionForInfo = function (containerName, loraStatusArray, callBackResponse) {

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
            //console.log(containerName + " : " + creationTime);

            console.log(creationTime);

            var loraSensorName = containerName;

            var tempJSONObject = new Object();
            tempJSONObject.devicFeName = loraSensorName;
            tempJSONObject.creationTime = creationTime;
            loraStatusArray.push(tempJSONObject);

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};


// Collecting the LoRa Sensors status
loraWebIndex.get('/localLoraSensorsStatusCollector', function (request, response) {

    var loraStatusArray = new Array();
    var iterationCount = 1;

    async.whilst(
        function() {
            return iterationCount < 136 //136
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

            retreiveExecutionForStatus(containerName, loraStatusArray, function (statusCode) {
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

// Collecting the LoRa Sensors info
loraWebIndex.get('/localLoraSensorsInfoCollector', function (request, response) {

    var loraStatusArray = new Array();
    var iterationCount = 1;

    async.whilst(
        function() {
            return iterationCount < 136 //136
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

            retreiveExecutionForStatus(containerName, loraStatusArray, function (statusCode) {
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

loraWebIndex.get('/loraEmailSendingTest', function (request, response) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_ID,
            pass: process.env.EMAIL_PWD
        }
    });

    var mailOptions = {
        from: 'forest62590@gmail.com',
        to: 'forest62590@naver.com',
        subject: 'Sending Email using Node.js',
        html: '<h1>Welcome</h1><p>That was easy!</p>'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
});

// Connecting the oneM2M Web Tester page.
loraWebIndex.get('/loraWebHome', function (request, response) {
    fs.readFile('loraWebHome.ejs', 'utf-8', function (error, data) {
        response.status(200).end(ejs.render(data));
    });
});

// Server start
http.createServer(loraWebIndex).listen(62590, function () {

    // var heartBeat = setInterval(function() {
    //     var targetURL = "http://localhost:7591/loraipe";
    //
    //     requestToAnotherServer({
    //         url: targetURL,
    //         method: 'GET',
    //         json: true,
    //         headers: { // Basic AE resource structure for registration
    //             'Accept': 'application/json',
    //         }
    //     }, function (error, response, body) {
    //         if(typeof(response) !== 'undefined') {
    //             console.log("LoRa IPE server is running at http://localhost:7591")
    //         } else if (error) {
    //             console.log(error)
    //
    //             var transporter = nodemailer.createTransport({
    //                 service: 'gmail',
    //                 auth: {
    //                     user: process.env.EMAIL_ID,
    //                     pass: process.env.EMAIL_PWD
    //                 }
    //             });
    //
    //             var maillist = [
    //                 'forest62590@naver.com',
    //                 'forest62590@gmail.com',
    //             ];
    //
    //             // Getting the current IPE terminated time
    //             var newDate =  new Date();
    //             var currentTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    //
    //             var mailOptions = {
    //                 from: 'forest62590@gmail.com',
    //                 to: maillist,
    //                 subject: 'LoRa IPE was terminated by unknown errors',
    //                 html: '<p>LoRa IPE was terminated at </p>' + '<p>' + currentTime + '</p>'
    //             };
    //
    //             transporter.sendMail(mailOptions, function(error, info){
    //                 if (error) {
    //                     console.log(error);
    //                 } else {
    //                     console.log('Email sent: ' + info.response);
    //                 }
    //             });
    //         }
    //     });
    // }, 60000);

    console.log('Server running port at ' + 'http://127.0.0.1:62590');
});