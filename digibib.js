{
    "translatorID":"e99bd723-39e6-418c-9524-390dbc583e08",
    "translatorType":4,
    "label":"digibib.net",
    "creator":"Heiko Jansen (hbz), Ingolf Kuss (hbz), Bernhard Assmann (hbz)",
    "target":"https?://.*\\.digibib\\.net/(Digibib|jumpto|opensearch)",
    "minVersion":"1.0",
    "maxVersion":"",
    "priority":100,
    "inRepository":false,
    "lastUpdated":"2012-03-07 12:00:00"
}

/*
    DigiBib Translator - Custom translator for adding metadata records found
    in the DigiBib portal (http://www.digibib.net/) to Zotero

    Copyright (C) 2012 hbz NRW (http://www.hbz-nrw.de/)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


var articles, foundItems;

/*
 * Check if the current page really is a page with results (hits) in it.
 * Also checks for the type of results because the different lists have
 * different semantics .
 *
 **/
function detectWeb(doc, url) {
    var namespace = doc.documentElement.namespaceURI;
    var nsResolver = namespace
        ? function(prefix) { if (prefix == "x") return namespace; else return null; }
        : null;

    var indicator = doc.evaluate('/html/body//span[@id="zotero"]',
                                 doc,
                                 nsResolver,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE,
                                 null )
                    .singleNodeValue;

    var indicator_class = indicator.getAttribute('class');
    if ( indicator_class.match(/multi/) ) {
        // There's one or more result list each containing one or more hits in this page
        return "multiple";
    }
    if ( indicator_class.match(/single/) ) {
        // There's one hit in this page
        return "single";
    }

    return "";
}


/*
 * Present a list of importable hits in the current page to the user.
 * Custom code is needed to handle the different result list types.
 * Finally import the items selected by the user.
 *
 **/
function doWeb(doc, url) {
    articles   = [];
    foundItems = [];

    var namespace  = doc.documentElement.namespaceURI;
    var nsResolver = namespace
        ? function(prefix) { if (prefix == "x") return namespace; else return null; }
        : null;

    var indicator = doc.evaluate('/html/body//span[@id="zotero"]',
                                 doc,
                                 nsResolver,
                                 XPathResult.ANY_TYPE,
                                 null )
                    .iterateNext();
    var indicator_class = indicator.getAttribute('class');

    var items = new Object();

    var conf = new Object;
    var type = '';
    // configure the extraction method
    if ( indicator_class.match(/multi/) ) {
      // There's one or more result list each containing one or more hits in this page
      if ( indicator_class.match(/z_metasearch_multi/) ) {
          conf["lists_xpath"]      = '//div[contains(@class,"listcontainer")]';
          conf["item_xpath"]       = './dl[contains(@class,"list")]/dt';
          conf["item_title_xpath"] = './a';
          conf["item_url_xpath"]   = 'following-sibling::dd[contains(@class,"func")]//a[contains(@class,"js_formatExport")]';
          conf["url_trnsfrm"]      = function (hitUrl) { return hitUrl.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS'); };
      }
      else if ( indicator_class.match(/z_ezb_multi/) ) {
          conf["lists_xpath"]      = '//div[contains(@class,"listcontainer")]';
          conf["item_xpath"]       = './dl[contains(@class,"list")]/dt';
          conf["item_title_xpath"] = './a[contains(@class,"js_getFull")]';
          conf["item_url_xpath"]   = './ul/li/a[contains(@class,"js_formatExport")]';
          conf["url_trnsfrm"]      = function (hitUrl) { return hitUrl.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS'); };
      }
      else if ( indicator_class.match(/z_digilink_multi/) ) {
          conf["lists_xpath"]      = '//div[contains(@class,"listcontainer")]';
          conf["item_xpath"]       = './dl[contains(@class,"list")]/dt';
          conf["item_title_xpath"] = './strong';
          conf["item_url_xpath"]   = 'following-sibling::dd[2]/ul/li/a[contains(@class,"js_formatExport")]';
          conf["url_trnsfrm"]      = function (hitUrl) { return hitUrl.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS'); };
      }
      else if ( indicator_class.match(/z_dbis_multi/) ) {
          conf["lists_xpath"]      = '//div[contains(@class,"listcontainer")]';
          conf["item_xpath"]       = './dl[contains(@class,"list")]/dt';
          conf["item_title_xpath"] = './a[contains(@class,"js_getFull")]';
          conf["item_url_xpath"]   = './/a[contains(@class,"js_formatExport")]';
          conf["url_trnsfrm"]      = function (hitUrl) { return hitUrl.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS'); };
      }
      else if ( indicator_class.match(/z_cart_multi/) ) {
          conf["lists_xpath"]      = '//div[contains(@class,"listcontainer")]';
          conf["item_xpath"]       = './dl[contains(@class,"list")]/dt';
          conf["item_title_xpath"] = 'child::*[2]';
          conf["item_url_xpath"]   = 'following-sibling::dd[3]//a[contains(@class,"js_formatExport")]';
          conf["url_trnsfrm"]      = function (hitUrl) { return hitUrl.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS'); };
      }
      items = _get_items_multi(doc, url, namespace, nsResolver, conf);
    }
    else if ( indicator_class.match(/z_[a-z]*_single/) ) {
        var urlNode = doc.evaluate(
            '/html/body/div/div/div[@id="main"]//a[contains(@class,"js_formatExport")]',
            doc,
            nsResolver,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        if ( urlNode ) {
            var hitUrl = urlNode.singleNodeValue.href.replace(/SUBSERVICE=DIRECT_EXPORT/,'SUBSERVICE=FORMAT_EXPORT').replace(/FORMAT=TXT/,'FORMAT=MODS');
            articles.push(hitUrl);
            Zotero.wait();
            _getAllItems();
            return;
        }
    }

    // Ask the user which hits she wants to import
    items = Zotero.selectItems(items);
    for ( var it in items ) {
        articles.push(it);
    }

    // Import the selected hits to zotero
    Zotero.wait();
    _getAllItems();
}


/*
 * Generic extraction of a list of records (title/url pairs) from the page
 * guided by a set of XPaths addressing the relevant html nodes.
 *
 **/
function _get_items_multi (doc, url, namespace, nsResolver, conf) {
    var myItems = new Object;

    // one or more lists in this page
    var listsSnapshot = doc.evaluate(
        conf["lists_xpath"],
        doc,
        nsResolver,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    var isSingleEntryList = listsSnapshot.snapshotLength == 1 ? true : false;

    // walk over every list
    for ( var i = 0; i < listsSnapshot.snapshotLength; i++ ) {
        var cur_list = listsSnapshot.snapshotItem(i);

        // get the entries in the current list
        var listEntriesSnapshot = doc.evaluate(
            conf["item_xpath"],
            cur_list,
            nsResolver,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        // for every entry extract title and url and store these pairs
        // in an hash object; keys are the urls
        for ( var j = 0; j < listEntriesSnapshot.snapshotLength; j++ ) {
            var cur_entry = listEntriesSnapshot.snapshotItem(j);
            var titleNode = doc.evaluate(
                conf["item_title_xpath"],
                cur_entry,
                nsResolver,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );

            var title, hitUrl;

            if ( titleNode.singleNodeValue == null ) {
                continue;
            }
            title = _formatTitle(isSingleEntryList, i, j, titleNode.singleNodeValue.textContent);
            
            var urlNode = doc.evaluate(
                conf["item_url_xpath"],
                cur_entry,
                nsResolver,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            if ( titleNode.singleNodeValue == null ) {
                continue;
            }

            hitUrl = conf["url_trnsfrm"](urlNode.singleNodeValue.href);
            myItems[hitUrl] = title;
        }
    }

    return myItems;
}

/*
 * Shorten the title of the record if necessary and prefix it
 * with a number
 *
 **/
function _formatTitle (isSingleEntryList, num_a, num_b, text) {
    var prefix = '';
    num_a++;
    num_b++;
    if (isSingleEntryList)
        prefix = ( num_b < 10 ? "0" + num_b : num_b ) + ": "; 
    else
        prefix = ( num_a < 10 ? "0" + num_a : num_a ) + "." + ( num_b < 10 ? "0" + num_b : num_b ) + ": ";

    text = ( text.length > 80 ) ? text.substr( 0, 77 ) + "..." : text;

    return prefix + text;
}

/*
 * For all items selected by the user: retrieve and import them.
 * Uses "global" variables to save state.
 *
 **/
function _getAllItems () {
    // check if there are still items to process
    if ( articles.length == 0 ) {
        for( var i in foundItems ) {
            foundItems[i].complete();
        }
        Zotero.done();
        return;
    }

    // second param is a callback that again calls _getAllItems recursively
    _retrieveItem(articles.pop(), function(obj, item) {
        foundItems.push(item);
        _getAllItems();
    });
}

/*
 * Fetch one item via HTTP/GET and import it to Zotero
 * using the standard MODS translator.
 * "callback" will save the imported item and recurse
 * to get the next one.
 *
 **/
function _retrieveItem (url, callback) {
    // retrieve URL
    Zotero.Utilities.HTTP.doGet(url, function(mods) {
        // import to zotero by relying on standard MODS translator
        var translator = Zotero.loadTranslator("import");
        translator.setTranslator("0e2235e7-babf-413c-9acf-f27cce5f059c"); // MODS-translator
        translator.setHandler("itemDone", callback);
        translator.setString(mods);
        translator.translate();
    });
}

