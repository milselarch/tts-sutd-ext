/* eslint-disable no-alert */
/* eslint-disable camelcase */
/* eslint-disable prefer-destructuring */
import $ from 'jquery'
import './index.styl'
import config from '../config'

console.log('Content script working...')
const base_url = config.base_url

function async_send_message(message) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(message, (response) => {
            return resolve(response)
        });
    })
}

function asleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve(true) }, ms)
    })
}

const d_elem = 'table > tbody > tr:nth-last-child(2) > td:nth-child(3)'
const t_elem = 'table > tbody > tr:nth-child(2) > td:nth-child(3)'

const isToday = (someDate) => {
    const today = new Date()
    return (
        someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear()
    )
}

const start = async () => {
    const url = window.location.href
    console.log('URL NOW', url)

    if (!url.startsWith(base_url)) {
        return 
    }

    // alert(`LOGIN STATUS`)
    const result = await async_send_message({
        'header': 'need_declare'
    })

    if (url.startsWith(`${base_url}/tt_login.aspx`)) {
        console.log('DECLARE RESPONSE', result, result.declare_needed, result.temp_needed)
        if (result.declare_needed || result.temp_needed) {
            const login_status = $('#pgContent1_valPassword').text();
            // alert(`LOGIN STATUS ${login_status}`)
            
            const ID = $('#pgContent1_uiLoginid').val().trim();
            console.log('STAT ID', [login_status, ID])

            if ((login_status === "") && (ID !== "")) {
                console.log('CLICK LOGIN BTTN')
                $('#pgContent1_btnLogin').trigger('click')
                return
            }
        }

        return
    }

    const declare_page = `${base_url}/tt_daily_dec_user.aspx`
    const temp_page = `${base_url}/tt_temperature_taking_user.aspx`
    
    if (result.declare_needed) {
        console.log('DELCARE NEEDED')
        if (!url.startsWith(declare_page)) {
            // alert(`s DECLARE STATUSS ${declare_page} ${url}`)
            window.location.replace(declare_page)
            return
        }

        const str_date = $(d_elem).text().trim()
        const last_declare_date = new Date(Date.parse(str_date))
        
        const checkboxes = [
            $('#pgContent1_rbVisitOtherCountryNo'),
            $('#pgContent1_rbNoticeNo'),
            $('#pgContent1_rbContactNo'),
            $('#pgContent1_rbMCNo')
        ]

        for (let k = 0; k < checkboxes.length; k += 1) {
            checkboxes[k].prop("checked", true);
        }

        if (!isToday(last_declare_date)) {
            await asleep(1000);
            // await async_send_message({ 'header': 'declared' })
            // $('#pgContent1_btnSave').trigger('click');
            return
        }

        await async_send_message({ 'header': 'declared' })
    }
    
    if (result.temp_needed) {
        if (!url.startsWith(temp_page)) {
            // alert('TEMP PAGE REPLACE')
            window.location.replace(temp_page)
            return
        }

        const str_date = $(t_elem).text().trim()
        const last_temp_date = new Date(Date.parse(str_date))
        const hours = last_temp_date.getHours()
        let last_temp_morning;
        let now_morning;

        const temp_select = $('#pgContent1_uiTemperature')
        temp_select.val('Less than or equal to 37.6°C')

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

        const mismatch = last_temp_morning !== now_morning
        const needs_temp = !isToday(last_temp_date) || mismatch
        console.log('TEMP NEEDED', !isToday(last_temp_date), mismatch)
        console.log('NOW MORNING', now_morning)

        if (needs_temp && (now_morning !== undefined)) {
            await asleep(1000);
            // await async_send_message({ 'header': 'temp' })
            // $('#pgContent1_btnSave').trigger('click')
            return
        }

        await async_send_message({ 'header': 'temp' })
    }
};

$(window).on('load', start)