const express = require('express');
const request = require('request');
const he = require('he');
const app = express();

var port = process.env.PORT || 8080;

app.set('json spaces', 2);

app.get('/', function (req, res) {
    res.send('FEH Stats API: /stats/{rarity}-{level}<br />\
              Unit Growths: /stats/growths');
});

app.get('/stats/:rarity-:level', function (req, res) {
  var maxLevel = req.params.level == 40 ? true : false;
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: maxLevel ? 'HeroMaxStats' : 'HeroBaseStats',
    fields: '_pageName=Name,HP,Atk,Spd,Def,Res',
    where: 'Variation="Neut" and Rarity=' + req.params.rarity
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(formatStats(JSON.parse(body)));
  });
});

app.get('/stats/growths', function (req, res) {
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'HeroGrowths',
    fields: '_pageName=Name,HP,Atk,Spd,Def,Res'
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(formatStats(JSON.parse(body)));
  });
});

app.listen(port, function () {
    console.log('Listening on port ' + port)
});

function formatStats(data) {
  var result = {};
  for (var unit of data.cargoquery) {
    var name = he.decode(unit.title.Name);
    result[name] = {
      HP: parseInt(unit.title.HP, 10),
      Atk: parseInt(unit.title.Atk, 10),
      Spd: parseInt(unit.title.Spd, 10),
      Def: parseInt(unit.title.Def, 10),
      Res: parseInt(unit.title.Res, 10)
    }
  }
  return result;
}
