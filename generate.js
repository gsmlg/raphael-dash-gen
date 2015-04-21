import fs from 'fs';
import {sync as mkdir} from 'mkdirp';
import jsdom from 'jsdom';
import Sequelize from 'sequelize';
import {exec} from 'child_process';

var docDir = './Raphael.docset/Contents/Resources/Documents';
mkdir(docDir);


function cp(f1, f2) {
  var f = fs.readFileSync(f1);
  fs.writeFileSync(f2, f);
}

cp('./icon.png','./Raphael.docset/icon.png');
cp('./icon@2x.png','./Raphael.docset/icon@2x.png');
cp('./Info.plist', './Raphael.docset/Contents/Info.plist');
cp('./dr.css', docDir + '/dr.css');
cp('./dr-print.css', docDir + '/dr-print.css');
cp('./raphael/raphael.js', docDir + '/raphael.js');
cp('./raphael/reference.js', docDir + '/reference.js');
cp('./raphael/reference.html', docDir + '/reference.html');

var ref = fs.readFileSync(docDir+'/reference.html', {charset: 'utf8'});


var seq = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: './Raphael.docset/Contents/Resources/docSet.dsidx'
});

var SearchIndex = seq.define('searchIndex', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  },
  type: {
    type: Sequelize.STRING
  },
  path: {
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true,
  timestamps: false
});

SearchIndex.sync({force: true})
  .then(function(){
    jsdom.env(
      ref.toString(),
      function(e, window) {
        if (e) throw e;
        var els = window.document.querySelectorAll('ol.dr-toc > li[class] > a');
        var docs = [].slice.call(els).map(function(el){
          var doc = {name: el.textContent};
          doc.type = '';
          switch(el.className) {
          case '{clas}':
            doc.type = 'Class';
            break;
          case 'dr-method':
            doc.type = 'Method';
            break;
          case 'dr-property':
            doc.type = 'Property';
            break;
          }
          doc.path = 'reference.html' + el.getAttribute('href', true);
          return doc;
        });
        SearchIndex.bulkCreate(docs).then(function(){
          var name = 'Raphael';
          exec(`tar --exclude='.DS_Store' -cvzf ${name}.tgz ${name}.docset`);
        });
      }
    );

  });

