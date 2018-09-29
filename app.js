const express = require('express');
const request = require('request');
const he = require('he');
const app = express();

app.set('json spaces', 2);

app.get('/', function (req, res) {
    res.send('FEH Stats API: /stats/{rarity}-{level}');
})

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
})

app.listen(3000, function () {
    console.log('Listening on port 3000')
})

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