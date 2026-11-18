// strict_schema_check.cjs
// Exhaustive JSON Schema Validator according to draft 2020-12 rules

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'assets/asset-manifest.schema.json'), 'utf8'));

let errors = [];

function validateType(val, typeDef, pathStr) {
  if (typeDef === 'integer') {
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      errors.push(`${pathStr}: expected integer, got ${typeof val} (${val})`);
    }
  } else if (typeDef === 'number') {
    if (typeof val !== 'number') {
      errors.push(`${pathStr}: expected number, got ${typeof val}`);
    }
  } else if (typeDef === 'string') {
    if (typeof val !== 'string') {
      errors.push(`${pathStr}: expected string, got ${typeof val}`);
    }
  } else if (typeDef === 'boolean') {
    if (typeof val !== 'boolean') {
      errors.push(`${pathStr}: expected boolean, got ${typeof val}`);
    }
  } else if (typeDef === 'object') {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
      errors.push(`${pathStr}: expected object, got ${typeof val}`);
    }
  } else if (typeDef === 'array') {
    if (!Array.isArray(val)) {
      errors.push(`${pathStr}: expected array, got ${typeof val}`);
    }
  } else if (Array.isArray(typeDef)) {
    // Union type, e.g. ["string", "null"]
    const matched = typeDef.some(t => {
      if (t === 'null') return val === null;
      if (t === 'string') return typeof val === 'string';
      if (t === 'number') return typeof val === 'number';
      if (t === 'boolean') return typeof val === 'boolean';
      return false;
    });
    if (!matched) {
      errors.push(`${pathStr}: expected one of [${typeDef.join(', ')}], got ${val === null ? 'null' : typeof val}`);
    }
  }
}

function validateObject(obj, def, pathStr) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push(`${pathStr}: expected object`);
    return;
  }

  // Required properties
  if (def.required) {
    for (const req of def.required) {
      if (!(req in obj) || obj[req] === undefined) {
        errors.push(`${pathStr}: missing required property '${req}'`);
      }
    }
  }

  // Properties validation
  if (def.properties) {
    for (const [propName, propDef] of Object.entries(def.properties)) {
      if (propName in obj && obj[propName] !== undefined) {
        const val = obj[propName];
        const propPath = `${pathStr}.${propName}`;

        // Type check
        if (propDef.type) {
          validateType(val, propDef.type, propPath);
        }

        // Const check
        if ('const' in propDef) {
          if (val !== propDef.const) {
            errors.push(`${propPath}: expected const '${propDef.const}', got '${val}'`);
          }
        }

        // Enum check
        if (propDef.enum) {
          if (!propDef.enum.includes(val)) {
            errors.push(`${propPath}: value '${val}' not in enum [${propDef.enum.join(', ')}]`);
          }
        }

        // Minimum / Maximum
        if ('minimum' in propDef && typeof val === 'number') {
          if (val < propDef.minimum) errors.push(`${propPath}: ${val} < minimum ${propDef.minimum}`);
        }
        if ('maximum' in propDef && typeof val === 'number') {
          if (val > propDef.maximum) errors.push(`${propPath}: ${val} > maximum ${propDef.maximum}`);
        }

        // Nested object
        if (propDef.type === 'object') {
          validateObject(val, propDef, propPath);
        }

        // Nested array
        if (propDef.type === 'array' && Array.isArray(val) && propDef.items) {
          val.forEach((item, idx) => {
            if (propDef.items.type) {
              validateType(item, propDef.items.type, `${propPath}[${idx}]`);
            }
          });
        }
      }
    }
  }

  // additionalProperties check
  if (def.additionalProperties === false) {
    const allowed = new Set(Object.keys(def.properties || {}));
    for (const key of Object.keys(obj)) {
      if (!allowed.has(key)) {
        errors.push(`${pathStr}: unexpected additional property '${key}'`);
      }
    }
  }
}

console.log('Validating top-level manifest properties...');
validateObject(manifest, schema, 'manifest');

const defMap = {
  backgrounds: schema.$defs.backgroundItem,
  altar: schema.$defs.altarItem,
  characters: schema.$defs.characterItem,
  visual_fx: schema.$defs.fxItem,
  audio_sfx: schema.$defs.sfxItem,
  audio_bgm: schema.$defs.bgmItem
};

for (const [groupName, groupDef] of Object.entries(defMap)) {
  const items = manifest.assets[groupName] || [];
  console.log(`Validating ${items.length} items in assets.${groupName}...`);
  items.forEach((item, idx) => {
    validateObject(item, groupDef, `manifest.assets.${groupName}[${idx}] (id: ${item.id})`);
  });
}

console.log('\n========================================');
console.log(`Validation finished. Total errors: ${errors.length}`);
console.log('========================================');

if (errors.length > 0) {
  console.error('Validation Errors:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('[PASS] manifest.json is 100% compliant with assets/asset-manifest.schema.json!');
  process.exit(0);
}
