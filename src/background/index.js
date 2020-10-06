/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
// OnInstall handler
import config from '../config'

const base_url = config.base_url

chrome.runtime.onInstalled.addListener(details => {
  console.log(details)
})

function asleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(true) }, ms)
  })
}

function async_get_storage(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(key, (result) => {
      return resolve(result)
    });
  })
}

function async_set_storage(key, value) {
  const item = {}
  item[key] = value

  return new Promise(resolve => {
    chrome.storage.local.set(item, (result) => {
      return resolve(result)
    });
  })
}

function get_tabs() {
  return new Promise(resolve => {
    chrome.tabs.query({}, tabs => {
      return resolve(tabs)
    })
  })
}

function create_tab(url) {
  return new Promise(resolve => {
    chrome.tabs.create({ url }, () => {
      resolve(true)
    });
  })
}

const isToday = (someDate) => {
  const today = new Date()
  return (
      someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear()
  )
}

async function need_declare() {
  const result = await async_get_storage('last_declare');
  const last_declare = result.last_declare
  console.log('LAST DECARE', last_declare, result)
  
  if (last_declare === undefined) {
    return true
  }

  const declare_date = new Date(last_declare)
  const needs_declaration = !isToday(declare_date)
  console.log('NEED DECLARE', declare_date, needs_declaration)
  return needs_declaration
}

async function need_temp() {
  // morning 0500-1300
  // evening 1800-2359
  const result = await async_get_storage('last_temp');
  const last_temp = result.last_temp
  console.log('LAST TEMP', last_temp, result)
  
  if (last_temp === undefined) {
    return true
  }

  const temp_date = new Date(last_temp)
  const hours = temp_date.getHours()
  let last_temp_morning;
  let now_morning;

  if ((hours >= 5) && (hours < 13)) {
    last_temp_morning = true
  } else if (hours >= 18) {
    last_temp_morning = false
  }

  const now_hours = (new Date()).getHours()
  
  if ((now_hours >= 5) && (now_hours < 13)) {
    now_morning = true
  } else if (now_hours >= 18) {
    now_morning = false
  }

  if (now_morning === undefined) {
    return false // too early or too late
  }

  const mismatch = last_temp_morning !== now_morning
  const needs_temp = !isToday(temp_date) || mismatch
  console.log('NEEDS TEMP', !isToday(temp_date), mismatch)
  return needs_temp
}

async function main() {
  const declaration_needed = await need_declare();
  const temp_needed = await need_temp();
  
  if (declaration_needed || temp_needed) {
    const tabs = await get_tabs()
    let has_declaration_site = false

    for (let k = 0; k < tabs.length; k += 1) {
      const current_tab = tabs[k]
      const current_url = current_tab.url
      
      if (current_url.startsWith(base_url)) {
        has_declaration_site = true
        break
      }
    }

    if (!has_declaration_site) {
      await create_tab(base_url)
    }
  };
}

chrome.runtime.onMessage.addListener(async (
  request, sender, send_response
) => {
  console.log('REQUEST', request)

  if (request.header === 'need_declare') {
    const declaration_needed = await need_declare();
    const temp_needed = await need_temp();

    send_response({ 
      'declare_needed': declaration_needed,
      'temp_needed': temp_needed
    })

  } else if (request.header === 'declared') {
    const declare_date = new Date()
    const timestamp = declare_date.getTime()
    await async_set_storage('last_declare', timestamp)
    console.log('SET last_declare', timestamp, declare_date)
    send_response({ 'declared': true })

  } else if (request.header === 'temp') {
    const temp_date = new Date()
    const timestamp = temp_date.getTime()
    await async_set_storage('last_temp', timestamp)
    console.log('SET last_temp', timestamp, temp_date)
    send_response({ 'temp': true })

  } else {
    send_response({error: `BAD HEADER ${request.header}`});
  }
});

(async () => {
  while (true) {
    await asleep(1000);
    await main()
  }
})()