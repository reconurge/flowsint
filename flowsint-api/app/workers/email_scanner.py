from typing import Dict, List, Any

# Separate research function using Holehe
async def perform_holehe_research(email: str) -> List[Dict[str, Any]]:
    """
    Uses Holehe to search for email accounts across multiple websites.
    Returns the results of the search.
    """
    try:
        from holehe.modules.social_media import instagram, twitter, snapchat, bitmoji, crevado, discord, strava, imgur, myspace, fanpop, taringa, tellonym, tumblr, odnoklassniki, wattpad, xing, vsco
        from holehe.modules.shopping import amazon, armurerieauxerre, naturabuy, envato, deliveroo, ebay, garmin, dominosfr, vivino
        from holehe.modules.mails import google, yahoo, laposte, mail_ru, protonmail
        from holehe.modules.osint import rocketreach
        from holehe.modules.cms import gravatar, atlassian, wordpress, voxmedia
        from holehe.modules.company import aboutme
        from holehe.modules.crm import amocrm, axonaut, zoho, teamleader, insightly, pipedrive, hubspot, nimble, nocrm, nutshell
        from holehe.modules.jobs import coroflot, freelancer, seoclerks
        from holehe.modules.crowfunding import buymeacoffee
        from holehe.modules.forum import babeshows, badeggsonline, biosmods, biotechnologyforums, blackworldforum, blitzortung, bluegrassrivals, thecardboard, therianguide, thevapingforum, cracked_to, onlinesequencer, demonforums, freiberg, koditv, mybb, cambridgemt, chinaphonearena, clashfarmer, codeigniter, cpaelites, cpahero, nattyornot, ndemiccreations, nextpvr
        from holehe.modules.learning import diigo, quora
        from holehe.modules.medias import ello, flickr, komoot, rambler, sporcle
        from holehe.modules.medical import caringbridge, sevencups
        from holehe.modules.music import blip, lastfm, smule, soundcloud, spotify, tunefind
        from holehe.modules.payment import venmo
        from holehe.modules.sport import bodybuilding
        from holehe.modules.porn import pornhub, redtube, xnxx, xvideos
        from holehe.modules.programing import codecademy, codepen, devrant, github, replit, teamtreehouse
        from holehe.modules.productivity import anydo, evernote
        from holehe.modules.products import samsung, eventbrite, nike
        import httpx
        client = httpx.AsyncClient()
        results = []
        
        modules = [
    armurerieauxerre.armurerieauxerre, 
    naturabuy.naturabuy,
    garmin.garmin,
    dominosfr.dominosfr,
    deliveroo.deliveroo,
    ebay.ebay,
    vivino.vivino,
    envato.envato,
    amazon.amazon,
    google.google,
    yahoo.yahoo,
    laposte.laposte,
    mail_ru.mail_ru,
    protonmail.protonmail,
    instagram.instagram,
    twitter.twitter,
    snapchat.snapchat,
    bitmoji.bitmoji, 
    crevado.crevado, 
    discord.discord, 
    strava.strava, 
    imgur.imgur, 
    myspace.myspace, 
    fanpop.fanpop, 
    taringa.taringa, 
    tellonym.tellonym, 
    tumblr.tumblr, 
    odnoklassniki.odnoklassniki, 
    wattpad.wattpad, 
    xing.xing, 
    vsco.vsco,
    rocketreach.rocketreach,
    gravatar.gravatar,
    atlassian.atlassian,
    wordpress.wordpress,
    voxmedia.voxmedia,
    aboutme.aboutme,
    amocrm.amocrm,
    axonaut.axonaut,
    zoho.zoho,
    teamleader.teamleader,
    insightly.insightly,
    pipedrive.pipedrive,
    hubspot.hubspot,
    nimble.nimble,
    nocrm.nocrm,
    nutshell.nutshell,
    coroflot.coroflot,
    freelancer.freelancer,
    seoclerks.seoclerks,
    buymeacoffee.buymeacoffee,
    babeshows.babeshows,
    badeggsonline.badeggsonline,
    biosmods.biosmods,
    biotechnologyforums.biotechnologyforums,
    blackworldforum.blackworldforum,
    blitzortung.blitzortung,
    bluegrassrivals.bluegrassrivals,
    thecardboard.thecardboard,
    therianguide.therianguide,
    thevapingforum.thevapingforum,
    cracked_to.cracked_to,
    onlinesequencer.onlinesequencer,
    demonforums.demonforums,
    freiberg.freiberg,
    koditv.koditv,
    mybb.mybb,
    cambridgemt.cambridgemt,
    chinaphonearena.chinaphonearena,
    clashfarmer.clashfarmer,
    codeigniter.codeigniter,
    cpaelites.cpaelites,
    cpahero.cpahero,
    nattyornot.nattyornot,
    ndemiccreations.ndemiccreations,
    nextpvr.nextpvr,
    diigo.diigo,
    quora.quora,
    ello.ello,
    flickr.flickr,
    komoot.komoot,
    rambler.rambler,
    sporcle.sporcle,
    caringbridge.caringbridge,
    sevencups.sevencups,
    blip.blip,
    lastfm.lastfm,
    smule.smule,
    soundcloud.soundcloud,
    spotify.spotify,
    tunefind.tunefind,
    venmo.venmo,
    bodybuilding.bodybuilding,
    pornhub.pornhub,
    redtube.redtube,
    xnxx.xnxx,
    xvideos.xvideos,
    codecademy.codecademy,
    codepen.codepen,
    devrant.devrant,
    github.github,
    replit.replit,
    teamtreehouse.teamtreehouse,
    anydo.anydo,
    evernote.evernote,
    samsung.samsung,
    eventbrite.eventbrite,
    nike.nike
]
        
        for module in modules:
            module_result = []
            try:
                await module(email, client, module_result)
                if module_result and module_result[0].get("exists") is not None:
                    results.append(module_result[0])
            except Exception as e:
                results.append({"error": f"Error in {module.__name__}: {str(e)}"})
        
        return {"results": results}
    
    except Exception as e:
        return {"error": f"Failed to initialize Holehe: {str(e)}"}