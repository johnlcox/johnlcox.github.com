---
layout: single
slug: writing-a-good-linux-init-script
title: Writing a Good Linux Init Script
author_profile: true
date: 2012-12-28
tags:
- java
- linux
- shell
- stackify
---

A good Linux init script that works across multiple distros is hard to find.  Most distros have a sample/skeleton init script to base your own init scripts on, but that requires having a separate init script for each distro.  For the [Stackify](http://www.stackify.com) Linux agent I wanted to have  a single init script that would work on all common Linux distros.  I had a decent init script that worked pretty well for 'start' and 'stop' commands, but not so much for 'status'.  The 'status' command worked on my development machine ([Ubuntu](http://www.ubuntu.com)) but didn't work on the other distros I was testing on ([CentOS](http://www.centos.org/)/[Redhat](http://www.redhat.com/)/[Amazon](https://aws.amazon.com/amis?platform=Amazon+Linux&selection=platform)).

Since one of the things the Stackify Linux agent does is provide information on the different installed services and their statuses, it is important that the status of our own service is correct.  As we prepare for the first beta release of the Linux agent, I decided it was time to rewrite the init script.  I started with some Google searches on how to create a cross-distro init script, but they mostly led me back to the skeleton init scripts.  While having lunch with a former coworker at [Fuzzy's Taco Shop](http://www.fuzzystacoshop.com/) -- which I highly recommend -- we got to discussing init scripts and he mentioned seeing an "init script to rule them all."

After lunch, I promptly searched for this legendary script.  My search lead me to the [One Java init script to rule them all](http://blog.rimuhosting.com/2009/09/30/one-java-init-script/), which is an init script for Java application servers (e.g. Tomcat and JBoss) that will work on most Linux distros.  Turns out this script was really close to what I needed since the Stackify Linux agent is a Java application.  Many Linux distros have started implementing the [Linux Standard Base](http://en.wikipedia.org/wiki/Linux_Standard_Base) (LSB) which provides logging methods and a standard way to implement init script statuses.  However, since not all versions support LSB, I cannot use those logging methods for my init script.

The nice thing about the Java init script to rule them all is that it checks for the existence of the LSB methods and if they do not exist it provides its own implementation.  I was able to base the Stackify agent init script largely on this existing script.  The script now works on all of the distros previously mentioned and should also work on most other distros.  The status returns the correct status on these distros and returns the correct status code for systems that do support LSB.
