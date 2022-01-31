const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qwiol.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('doctors'));
app.use(fileUpload());

const port = 5000;

app.get('/', (req, res)=>{
    res.send('Hello')
})


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const appointmentCollection = client.db("doctorsPortal").collection("appointments");
  const doctorCollection = client.db("doctorsPortal").collection("doctors");
  app.post('/addAppointment', (req, res)=>{
           const appointment = req.body;
           appointmentCollection.insertOne(appointment)
           .then(result => {
               res.send(result.insertedCount > 0)
           })
       });

       app.post('/appointmentsByDate', (req, res)=>{
        const date = req.body;
        const email = req.body.email;
        doctorCollection.find({email: email})
        .toArray((err,doctors)=> {
            const filter = {date: date.date}
            if(doctors.length === 0){
                filter.email = email;
            }
            appointmentCollection.find(filter)
            .toArray((err, documents) => {
                res.send(documents);
            })
            
        })
    });

    app.get('/appointments', (req, res) =>{
        appointmentCollection.find({})  
        .toArray((err, documents)=>{
            res.send(documents);
        })
    });

    app.post('/addADoctor', (req, res)=>{
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const phone = req.body.phone;
        const filePath = `${__dirname}/doctors/${file.name}`;
        console.log(file,name,email,phone)
        file.mv(filePath, err=>{
            if(err){
                console.log(err);
                res.status(500).send({msg:'Failed to upload image'});
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer(encImg, 'base64')
            };

            doctorCollection.insertOne({name, email, phone, image})
            .then(result => {
                fs.remove(filePath, error =>{
                    if(error){
                        res.status(500).send({msg:'Failed to upload image'})
                    }
                    res.send(result.insertedCount > 0)
                })
                
            })

            // return res.send({name:file.name, path:`/${file.name}`});
        })
    });

    app.get('/doctors', (req, res)=>{
        doctorCollection.find({})
        .toArray((err, documents)=>{
            res.send(documents);
        })

    });

    app.post('/isDoctor', (req, res)=>{
        const email = req.body.email;
        doctorCollection.find({email: email})
        .toArray((err,doctors)=> {
           res.send(doctors.length > 0);  
        })
    })
});


app.listen(process.env.PORT || port)