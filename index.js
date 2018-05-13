let SERVER_NAME = 'credit-card-with-mongo'

// Port variable is prepared to work with Heroku. Also HOST variable commented to enable Heroky without problems
let PORT = process.env.PORT || 5000
//let HOST = '127.0.0.1'

// MONGOOSE  SETUP
var http = require ('http');
var mongoose = require ("mongoose");
var ipaddress = process.env.IP; 

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGODB_URI || 
  'mongodb://localhost/creditcard-db';

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Successfully connected to: ' + uristring);
  }
});

// Data Schemas

var credditCardSchema = new mongoose.Schema({
  CampaignID: String, 
  NameOnCard: String, 
  CardNumber: String,
  ExpiryDate: String,
  SecurityCode: String,
  PostalCode: String
});

// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'CC' collection in the MongoDB database
var CreditCard = mongoose.model('CreditCard', credditCardSchema);

let restify = require('restify')

  // Get a persistence engine for the CC and their clinical data
  , creditCardSave = require('save')('creditcards')

  // Create the restify server
  , server = restify.createServer({ name: SERVER_NAME})

  // if (typeof ipaddress === "undefined") {
	// 	//  Log errors on OpenShift but continue w/ 127.0.0.1 - this
	// 	//  allows us to run/test the app locally.
	// 	console.warn('No process.env.IP var, using default: ' + DEFAULT_HOST);
	// 	ipaddress = DEFAULT_HOST;
	// };

	// if (typeof port === "undefined") {
	// 	console.warn('No process.env.PORT var, using default port: ' + DEFAULT_PORT);
	// 	port = DEFAULT_PORT;
	// };

// We are not using HOST parameter for avoiding problems with Heroku deployment
//server.listen(PORT, HOST, function () {
  server.listen(PORT, function () {
  console.log('Server %s listening at %s', server.name, server.url)
  console.log('Resources:')
  console.log(' /creditcards    method: GET')
  console.log(' /creditcards    method: POST')
  console.log(' /creditcards    method: PUT')
  console.log(' /creditcards    method: DEL')
})

server
  // Allow the use of POST
  .use(restify.fullResponse())

  // Maps req.body to req.params so there is no switching between them
  .use(restify.bodyParser())


//#region FOR CATCHING OTHER ROUTES
// Catch all other routes and return a default message
server.get('/', function (req, res, next) {
  res.send('CreditCard RESTful API')
});
//#endregion

//#region CC API

// Get CC in the system
server.get('/creditcards', function (req, res, next) {

  console.log('Requesting /creditcards');
  // Find every creditcard within the given collection
  CreditCard.find().exec(function (error, creditcards) {
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
    // Return first CC in the system
    res.send(creditcards)
  })
})

// Create a new CC
server.post('/creditcards', function (req, res, next) {
  console.log('POST request: creditcards');
  // Get new CC data from the request object
  let newCC = ''
  try {
      newCC = getCreditCardData(req)
  } catch (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.message)))
  }

  console.log('Saving..');

  // Create the creditcard using the persistence engine
  newCC.save(function (error, creditcard) {

    console.log('response received');

    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    // Send the creditcard if no issues
    res.send(201, creditcard)
  })
})

// Update a CC by their id
server.put('/creditcards/:id', function (req, res, next) {
  // Get CC updated data and create a new CC object
  let updatedCC = getCreditCardData(req)
  updatedCC._id = req.params.id

  // Update the CC with the persistence engine
  CreditCard.update({_id:req.params.id}, updatedCC, { multi: false }, function (error, creditcard) {

    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    // Send a 200 OK response
    res.send(200, true)
  })
})

// Delete CC with the given id
server.del('/creditcards/:id', function (req, res, next) {
  
  // Delete the CC with the persistence engine
  CreditCard.remove({_id: req.params.id}, function (error, creditcard) {
    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    // Send a 200 OK response
    res.send()
  })
  
})
//#endregion

//#region  PRIVATE METHODS
function getCreditCardData(req){
  // Make sure CampaignID, NameOnCard, CardNumber, 
  // ExpiryDate, SecurityCode and PostalCode 
  // are defined
  if (req.params.CampaignID === undefined) {
    throw new Error('CampaignID must be supplied')
  }
  if (req.params.NameOnCard === undefined) {
    throw new Error('NameOnCard must be supplied')
  }
  if (req.params.CardNumber === undefined) {
    throw new Error('CardNumber must be supplied')
  }
  if (req.params.ExpiryDate === undefined) {
    throw new Error('ExpiryDate must be supplied')
  }
  if (req.params.SecurityCode === undefined) {
    throw new Error('SecurityCode must be supplied')
  }
  if (req.params.PostalCode === undefined) {
    throw new Error('PostalCode must be supplied')
  }

  let newCC = new CreditCard({
		CampaignID: req.params.CampaignID, 
    NameOnCard: req.params.NameOnCard,
    CardNumber: req.params.CardNumber,
    ExpiryDate: req.params.ExpiryDate,
    SecurityCode: req.params.SecurityCode,
    PostalCode: req.params.PostalCode
  });

  return newCC
}