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
                <li>Stats 5* Lv1: GET /stats</li>\
                <li>Stat Growths: GET /stats/growths</li>\
                <li>Unit Info:</li>\
                <ul>\
                  <li>All units: GET /units</li>\
                  <li>Base rarity of all units: GET /units/rarity</li>\
                  <li>One unit: GET /units/{unit_name}</li>\
                  <li>List of units: POST /units</li>\
                </ul>\
              </ul>');
});

app.get('/stats', function (req, res) {
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'UnitStats',
    fields: '_pageName=Name,Lv1HP5,Lv1Atk5,Lv1Spd5,Lv1Def5,Lv1Res5'
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, async (err, response, body) => {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(await formatStats(JSON.parse(body)));
  });
});

app.get('/stats/growths', function (req, res) {
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'UnitStats',
    fields: '_pageName=Name,HPGR3,AtkGR3,SpdGR3,DefGR3,ResGR3'
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, async (err, response, body) => {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(await formatGrowths(JSON.parse(body)));
  });
});

app.get('/units/rarity', async (req, res) => {
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'Heroes',
    fields: '_pageName=Name,Title,SummonRarities,RewardRarities'
  }
  request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    res.json(formatUnitRarity(JSON.parse(body)));
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

async function getHeroNames() {
  var result = [];
  var formData = {
    action: 'cargoquery',
    format: 'json',
    limit: '500',
    tables: 'Units',
    fields: '_pageName=Name',
    where: "IFNULL(Properties__full,'') NOT LIKE '%enemy%'"
  }
  await request.post({ url:'https://feheroes.gamepedia.com/api.php', formData: formData }, function (err, response, body) {
    if (err) {
      return console.error('request failed: ', err);
    }
    
    for (var unit of JSON.parse(body).cargoquery) {
      result.push(he.decode(unit.title.Name));
    }
  });
  return result;
}

async function formatStats(data, rarity, level) {
  var heroes = await getHeroNames();
  var result = {};
  for (var unit of data.cargoquery) {
    var name = he.decode(unit.title.Name);
    if (heroes.includes(name))
    {
      result[name] = {
        HP: parseInt(unit.title.Lv1HP5, 10),
        Atk: parseInt(unit.title.Lv1Atk5, 10),
        Spd: parseInt(unit.title.Lv1Spd5, 10),
        Def: parseInt(unit.title.Lv1Def5, 10),
        Res: parseInt(unit.title.Lv1Res5, 10)
      }
    }
  }
  return result;
}

async function formatGrowths(data) {
  var heroes = await getHeroNames();
  var result = {};
  for (var unit of data.cargoquery) {
    var name = he.decode(unit.title.Name);
    if (heroes.includes(name))
    {
      result[name] = {
        HP: parseInt(unit.title.HPGR3, 10),
        Atk: parseInt(unit.title.AtkGR3, 10),
        Spd: parseInt(unit.title.SpdGR3, 10),
        Def: parseInt(unit.title.DefGR3, 10),
        Res: parseInt(unit.title.ResGR3, 10)
      }
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

function formatUnitRarity(data) {
  var result = {};
  for (var unit of data.cargoquery) {
    var name = he.decode(unit.title.Name);
    var summon = unit.title.SummonRarities ? parseInt(unit.title.SummonRarities[0], 10) : 5;
    var reward = unit.title.RewardRarities ? parseInt(unit.title.RewardRarities[0], 10) : 5;
    result[name] = Math.min(summon, reward);
  }
  return result;
}
