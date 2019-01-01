const express = require('express');
const request = require('request-promise');
const he = require('he');
const app = express();

var port = process.env.PORT || 8080;

app.set('json spaces', 2);
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies

app.get('/', function (req, res) {
    res.send('FEH Stats API<br />\
              <ul>\
                <li>Stats: GET /stats/{rarity}-{level}</li>\
                <li>Stat Growths: GET /stats/growths</li>\
                <li>Unit Info:</li>\
                <ul>\
                  <li>All units: GET /units</li>\
                  <li>One unit: GET /units/{unit_name}</li>\
                  <li>List of units: POST /units</li>\
                </ul>\
              </ul>');
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

app.get('/units', function (req, res) {
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'Heroes',
    fields: '_pageName=Name,Title,WeaponType,MoveType'
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(formatUnits(JSON.parse(body)));
  });
});

app.get('/units/:unit', function (req, res) {
  unit = req.params.unit.split(':')
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'Heroes',
    fields: '_pageName=Name,Title,WeaponType,MoveType',
    where: "Heroes.Name='" + unit[0] + "' AND Heroes.Title='" + unit[1].trim() + "'"
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(formatUnits(JSON.parse(body), true));
  });
});

app.post('/units', async (req, res) => {
  var result = {}
  await Promise.all(req.body.map(async (name) => {
    unit = name.split(':')
    var formData = {
      action: 'cargoquery',
      format: 'json',
      limit: '500',
      tables: 'Heroes',
      fields: '_pageName=Name,Title,WeaponType,MoveType',
      where: "Heroes.Name='" + unit[0] + "' AND Heroes.Title='" + unit[1].trim() + "'"
    }
    await request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
      if (err) {
        return console.error('request failed: ', err);
      }
      result = {...result, ...formatUnits(JSON.parse(body), true)};
    });
  }));
  res.json(result)
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

function formatUnits(data, withSkills) {
  var result = {};
  for (var unit of data.cargoquery) {
    var name = he.decode(unit.title.Name);
    var title = he.decode(unit.title.Title);
    var weapon = unit.title.WeaponType.replace('Colorless', 'Neutral').split(' ');
    var movType = unit.title.MoveType;
    result[name] = {
      name: name.split(':')[0],
      title: title,
      color: weapon[0],
      wpnType: weapon[1],
      movType: movType
    }
    if (withSkills) {
      result[name].skills = {
        weapon: [
          {
            "name": "",
            "unlock": 1
          }
        ],
        assist: [
          {
            "name": "",
            "unlock": 1
          }
        ],
        special: [
          {
            "name": "",
            "unlock": 1
          }
        ],
        passiveA: [
          {
            "name": "",
            "unlock": 1
          }
        ],
        passiveB: [
          {
            "name": "",
            "unlock": 1
          }
        ],
        passiveC: [
          {
            "name": "",
            "unlock": 1
          }
        ]
      }
    }
  }
  return result;
}
