/**
 * Created by JaeYoungHwang on 2017-01-11.
 */

var fs = require('fs');
var ejs = require('ejs');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var requestToServer = require('request');

var loraWebIndex = express();
loraWebIndex.use(bodyParser.json());
loraWebIndex.use(bodyParser.urlencoded({extended: false}));
loraWebIndex.use(express.static('CSS'));
loraWebIndex.use(express.static('ajax'));
loraWebIndex.use(express.static('bootstrap'));
loraWebIndex.use(express.static('pages'));
loraWebIndex.use(express.static('tuiGrid'));
loraWebIndex.use(express.static('scripts'));

// Connecting the oneM2M Web Tester page.
loraWebIndex.post('/localTestingNode', function (request, mainResponse) {

    var resultObj = request.body;
    var configObject = resultObj['testConfig'];
    var testcaseNameArray = configObject['testcaseName'];
    var testcaseParamArray = configObject['testcaseParam'];

    for(var i = 0; i < testcaseNameArray.length; i++)
        console.log(testcaseParamArray[i]);

    requestToServer({
        url :'http://192.168.214.129:62590/TesterNode',
        method : 'POST',
        json: true,
        body: {
            "TestcaseName" : testcaseNameArray,
            "TestcaseParameter" : testcaseParamArray
        }},function(error, response ,body) {
        console.log("Entering the original server");

        var jsonObject  = new Object( );
        jsonObject.result = response.body;
        console.log(response.body);

        if(error) {
            mainResponse.status(200).send(jsonObject);
        } else {
            mainResponse.status(200).send(jsonObject);
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
    console.log('Server running port at ' + 'http://127.0.0.1:62590');
});