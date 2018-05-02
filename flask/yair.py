#!/usr/bin/env python2

"""
Gathers Vulnerability Information and outputs it in a fancy way :-)
"""

import re
import os
import sys
import json
import requests
from tabulate import tabulate
import textwrap
import yaml
import logging
import pprint


CONS_EMPTY='sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4'
try:
    with open("config/config.yaml", 'r') as cfg:
        config = yaml.load(cfg)
except yaml.parser.ParserError:
    print >> sys.stderr, "error while parsing config.yaml"
    exit(1)


image_score_fail_on=config['fail_on']['score']
big_vuln_fail_on=bool(config['fail_on']['big_vulnerability'])
docker_registry="registry.hub.docker.com"
output=config['output']['format']



def pretty_print_POST(req):
    """
    At this point it is completely built and ready
    to be fired; it is "prepared".

    However pay attention at the formatting used in 
    this function because it is programmed to be pretty 
    printed and may differ from the actual request.
    """
    print('{}\n{}\n{}\n\n{}'.format(
        '-----------START-----------',
        req.method + ' ' + req.url,
        '\n'.join('{}: {}'.format(k, v) for k, v in req.headers.items()),
        req.body,
    ))

def y_req(address, method, h={}, data={}):
    try:
        if method == "get":
            req_result = requests.get(address, headers=h)
            req_result.raise_for_status()
        elif method == "post":
            req_result = requests.post(address, headers=h, data=data)
            req_result.raise_for_status()
        elif method == "delete":
            req_result = requests.delete(address, headers=h)
            req_result.raise_for_status()
        return req_result
    except requests.exceptions.HTTPError as err:
        logging.error(err)
        req = req_result.request

        # command = "curl -X {method} -H {headers} -d '{data}' '{uri}'"
        # method = req.method
        # uri = req.url
        # data = req.body
        # headers = ['"{0}: {1}"'.format(k, v) for k, v in req.headers.items()]
        # headers = " -H ".join(headers)
        # c = command.format(method=method, headers=headers, data=data, uri=uri)
        # logging.info("%s", c)
        # logging.warning(req_result.request.url)
        # logging.warning(req_result.request.body)
        # logging.warning(req_result.request.headers)
        raise Exception('Error HTTPError')

    except requests.exceptions.ConnectionError as err:
        print >> sys.stderr, "connection to " + address + " failed"
        raise Exception('Connection failed')

    except Exception as err:
        print >> sys.stderr, err


def get_registry_token(image_name, image_tag):
    req_headers = {}
    req_url = "https://" + docker_registry + "/v2/" + image_name + "/manifests/" + image_tag
    req_headers['Accept'] = 'application/vnd.docker.distribution.manifest.v2+json'
    try:
        req_result = requests.get(req_url, headers=req_headers)
        if req_result.status_code == 401:
            auth_header = req_result.headers['WWW-Authenticate'].split(',')
            registry_auth = auth_header[0].replace('Bearer realm=', '').replace('"', '')
            registry_service = auth_header[1].replace('"', '')
            registry_scope = auth_header[2].replace('"', '')
            req_url = registry_auth + "?" + registry_service + "&" + registry_scope + "&offline_token"
            req_result = y_req(req_url, "get")
            data = json.loads(req_result.text)
            registry_token = "Bearer " + data['token']
            req_headers['Authorization'] = registry_token
        else:
            registry_token = ""
            req_result.raise_for_status()
    except requests.exceptions.HTTPError as err:
        print >> sys.stderr, err
        raise Exception('HTTPError')
    except requests.exceptions.ConnectionError as err:
        print >> sys.stderr, "connection to " + address + " failed"
        raise Exception('Connection failed')
    return registry_token


def get_image_manifest(registry_token, image_name, image_tag):
    req_headers = {}

    req_url = "https://" + docker_registry + "/v2/" + image_name + "/manifests/" + image_tag
    req_headers['Authorization'] = registry_token
    req_headers['Accept'] = 'application/vnd.docker.distribution.manifest.v2+json'
    try:
        req_result = y_req(req_url, "get", h=req_headers)
    except requests.exceptions.HTTPError as err:
        print >> sys.stderr, err
        raise Exception('HTTPError')
    except requests.exceptions.ConnectionError as err:
        print >> sys.stderr, "connection to " + address + " failed"
        raise Exception('Connection failed')


    if req_result.status_code == 404:
        raise ValueError("image not found")
    req_result.raise_for_status()

    data = json.loads(req_result.text)
    return data

def get_image_manifest_v1(registry_token, image_name, image_tag):
    req_headers = {}

    req_url = "https://" + docker_registry + "/v2/" + image_name + "/manifests/" + image_tag
    req_headers['Authorization'] = registry_token
    req_headers['Accept'] = 'application/vnd.docker.distribution.manifest.v1+json'
    try:
        req_result = y_req(req_url, "get", h=req_headers)
    except requests.exceptions.HTTPError as err:
        print >> sys.stderr, err
        raise Exception('HTTPError')
    except requests.exceptions.ConnectionError as err:
        print >> sys.stderr, "connection to " + address + " failed"
        raise Exception('Connection failed')


    if req_result.status_code == 404:
        raise ValueError("image not found")
    req_result.raise_for_status()

    data = json.loads(req_result.text)
    return data


def get_image_layers(image_name,image_tag, registry_token):
    try:
        manifest = get_image_manifest(registry_token, image_name, image_tag)
    except:
        logging.warning("Get image manifest %s", image_name)
        raise

    #pprint.pprint(manifest)
    #print manifest['schemaVersion']
    if manifest['schemaVersion'] == 1:
        result = map(lambda x: x['blobSum'] , manifest['fsLayers'])
        result = list(filter(lambda x: x != CONS_EMPTY, result))

        result.reverse() # schema v1 need the reversed order

        logging.info("Layer v1 %s", image_name)

        return '', result, manifest

    elif manifest['schemaVersion'] == 2:
        image_digest = manifest['config']['digest']
        result = map(lambda x: x['digest'], manifest['layers'])
        result = list(filter(lambda x: x != CONS_EMPTY, result))

        return image_digest, result, manifest

    else:
        raise NotImplementedError("unknown schema version")


def analyse_image(image_digest, image_name, image_tag, layers, registry_token, clair_server):
    # delete old check results
    try:
        req_url = "http://" + clair_server + "/v1/layers/" + layers[-1]
        req_result = requests.delete(req_url)
        if req_result.status_code != 404:
            req_result.raise_for_status()
    except requests.exceptions.HTTPError as err:
        print >> sys.stderr, err
        raise Exception('HTTPError')
    except requests.exceptions.ConnectionError as err:
        print >> sys.stderr, "connection to " + req_url + " failed"
        raise Exception('Connection')
    image_digest_clean = image_digest.replace('sha256:','')

    for i in range(0, layers.__len__()):
        layer_clean = layers[i].replace('sha256:','')
        json_data = { "Layer": { "Name": "", "Path": "", "Headers": { "Authorization": "" }, "ParentName": "", "Format": "" }} # json template
        json_data['Layer']['Name'] = "%s%s" %(image_digest_clean, layer_clean)

        json_data['Layer']['Path'] = "https://" + docker_registry + "/v2/" + image_name + "/blobs/" + layers[i]
        json_data['Layer']['Headers']['Authorization'] = registry_token
        if i == 0:
            json_data['Layer']['ParentName'] = ""
        else:
            parent_clean = layers[i-1].replace('sha256:','')
            json_data['Layer']['ParentName'] = "%s%s" %(image_digest_clean, parent_clean)

        json_data['Layer']['Format'] = "Docker"

        req_url = "http://" + clair_server + "/v1/layers"
        req_headers = { 'Content-Type': 'application/json' }
        logging.info("Push %s of %s", layers[i], image_name)
        req_result = y_req(req_url, "post", data=json.dumps(json_data), h=req_headers)

def get_image_info(image_name, clair_server):
    vuln_data = []
    severitys= ["Unknown","Negligible","Low", "Medium", "High", "Critical", "Defcon1"]

    req_url = "http://" + clair_server + "/v1/layers/" + layers[-1] + "?features&vulnerabilities"
    req_headers = {'Content-Type': 'application/json'}
    req_result = y_req(req_url, "get", h=req_headers)

    data = req_result.json()
    if 'Features' not in data['Layer']:
        logging.warning('could not find any package in the given image %s', image_name)
        return None
    data = data['Layer']['Features']
    for d in data:
        if "Vulnerabilities" in d:
            for v in d['Vulnerabilities']:
                vd = dict (
                    package_name = d['Name'],
                    installed_version = d['Version'],

                    namespace_name = v['NamespaceName'],
                    cve_severity = v['Severity'],
                    cve_name = v['Name'],
                    cve_link = v['Link'],
                )
                if 'FixedBy' in v:
                    vd['cve_fixed_version'] = v['FixedBy']
                else:
                    vd['cve_fixed_version'] = ""
                if 'Description' in v:
                    vd['cve_desc'] = v['Description']
                else:
                    vd['cve_desc'] = ""
                vuln_data.append(vd)

                for i in range(0, severitys.__len__()):
                    if severitys[i] == vd['cve_severity']:
                        vd['cve_severity_nr'] = i

    return vuln_data

def send_to_rocket(message, emoji):
    if rocket_chat_enable:
        for receiver in rocket_receiver:
            payload = {"icon_emoji": emoji, "channel": receiver, "text": message}
            y_req(rocket_hook_url, "post", data=json.dumps(payload))


def run_test(image_fullname, clair_server, log_level):

    logging.basicConfig(level=log_level,
                        format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s) %(message)s',)


    try:
        image, image_tag = image_fullname.split(':')
    except ValueError:
        image = image_fullname
        image_tag = "latest"

    image_data = image.split('/')
    if image_data.__len__() == 3:
        docker_registry = image_data[0]
        image_name = image_data[1] + "/" + image_data[2]
    elif image_data.__len__() == 1:
        image_name = "library/" + image
    else:
        image_name = image

    try:
        registry_token = get_registry_token(image_name,image_tag)
    except:
        logging.warning('Registry failed %s', image_name)
        raise

    try:
        image_digest, layers, manifest_v2 = get_image_layers(image_name,image_tag,registry_token) 
    except:
        logging.warning('get image layers failed %s', image_name)
        raise

    try:
        manifest_v1 = get_image_manifest_v1(registry_token, image_name, image_tag)
    except:
        logging.warning('get image manifest v1 failed %s', image_name)

    try:
        analyse_image(image_digest, image_name, image_tag, layers, registry_token, clair_server)
    except Exception as err:
        logging.warning('Image not supported %s %s', image_name, err)
        raise



    return image_digest, layers, manifest_v2, manifest_v1
