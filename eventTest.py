#!/usr/bin/env python3

from xmlrpc.server import SimpleXMLRPCServer
from xmlrpc.client import ServerProxy
import logging
import time
from threading import Timer

#intialize logging
logging.basicConfig(level=logging.INFO)

#homematic xmlrpc url
homematicurl='http://192.168.43.132:2010'
#homematic xmlrpc url with auth enabled
#homematicurl='http://Admin:admin@192.168.43.131:2010'

#eventServer host
serverhost='192.168.43.110'
#eventServer port
serverport=8085

clientId="PythonEventServer"

#define function to register receiver url 
def registerClient():
    url='http://'+serverhost+':'+str(serverport)
    proxy = ServerProxy(homematicurl)
    proxy.init(url, clientId)
    print('Registered receiver url '+url)

def unregisterClient():
    url='http://'+serverhost+':'+str(serverport)
    proxy = ServerProxy(homematicurl)
    proxy.init(url)
    print('Registered receiver url '+url)    

#Register client
Timer(2, registerClient, ()).start()

#Create server
print('Listening on interface '+serverhost)
server = SimpleXMLRPCServer( (serverhost, serverport), logRequests=False ,)


def event(interfaceId, address, valueKey, value):
    stamp=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
    msg=' '+stamp+' | event | address='+str(address)+' '+str(valueKey)+' - '+str(value)
    print(msg)


def listDevices(interfaceId):
    list = []
    print("listDevices")
    return list 

def newDevices(interfaceId, deviceDescriptions):
    list = []
    print("newDevices")
    return list

def deleteDevices(interfaceId, adressesArray):
    print("deleteDevices")
    print(adressesArray)

def updateDevice(interfaceId, address, hint):
    print("updateDevice")

#def readdedDevice(interfaceId, adressees):
#    print("readdedDevice")

def replaceDevice(interfaceId, arg1, arg2):
    print("replaceDevice")
    

#server.register_introspection_functions()
server.register_multicall_functions()
server.register_function(event)
server.register_function(listDevices)
server.register_function(newDevices)
server.register_function(deleteDevices)
server.register_function(updateDevice)
#server.register_function(readdedDevice)
server.register_instance(replaceDevice)


#Start server
try:
    print('Use ctrl+c to exit')
    server.serve_forever()
except KeyboardInterrupt:
    unregisterClient()
    print('Exiting...')
