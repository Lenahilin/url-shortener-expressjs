require('dotenv').config();
const express = require('express');
var morgan = require('morgan')

const dns = require('dns');

const app = express();

require('dotenv').config();
var mongoose = require('mongoose');
var bodyParser = require('body-parser')

const port = process.env.PORT || 3000;

app.use(morgan('combined'))
app.use('/public', express.static(`${process.cwd()}/public`));
app.use('/api/shorturl/new', bodyParser.urlencoded({extended: false})); 

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose
     .connect( process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
     .then(() => console.log( 'Database Connected' ))
     .catch(err => console.log( err ));

const aliasSchema = new mongoose.Schema({
  origin: {
    type: String,
    required: true
    }
});

const Alias = mongoose.model('Alias', aliasSchema);

const createRecord = (url, done) => {
  var record = new Alias({
                    origin: url
                    // key: new mongoose.Types.ObjectId()
                  });
  record.save((err, data) => {
    if (err) return console.error(err);
    done(null, data);
  });
};

const findOrigin = (key, done) => {
  Alias.findById(key, (err, data) => {
    if (err) return console.error(err);
    done(null, data); // TODO: what is the right place to handle cases when no data is found (data == null)?
  });
};

/* creating a db entry */
app.post('/api/shorturl/new', (req, res) => {
  console.log(req.body.url, typeof(req.body.url));
  // TODO: better validation maybe?
  dns.lookup(req.body.url, (err, address, family) => {
    if (err || req.body.url == '') {
      console.log(err);
      res.json({error: 'invalid url'});
    } else {
        createRecord(req.body.url, (err, data) => {
          if (err) return next(err);
          console.log('data:', data);
          res.json({ original_url : req.body.url, short_url : data._id});
        }); 
    }
  });
});
  
/* return 302 redirect or 404 not found*/
app.get('/api/shorturl/:key', (req, res) => {
  findOrigin(req.params.key, (err, data) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (!data) res.status(404).send('There is no record, please try another alias');
    else if (data.origin.startsWith('http')) res.redirect(data.origin);
    else res.redirect('http://' + data.origin)
  });
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
