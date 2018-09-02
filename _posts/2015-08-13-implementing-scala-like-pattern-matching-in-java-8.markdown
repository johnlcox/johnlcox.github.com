---
layout: single
title: "Implementing Scala-like Pattern Matching in Java 8"
author_profile: true
date: 2015-08-13
tags:
- java
- scala
- lambda expressions
- pattern matching
---

I've been writing Scala off and on for the last several years. I took both of the Scala courses on Coursera and really enjoyed them. However, I still write a lot of Java. There are a lot of Scala features that I miss while working with Java, and as Java 8 was coming out in early 2014, I thought about feature parity between the two languages. The addition of lambdas to Java is great, but one of my favorite features of Scala is pattern matching, and Java 8 does not include that. At the time I started to wonder if pattern matching could be implemented as a Java library. I wasn't sure if it would even be possible, but I wrote up a quick [Github gist](https://gist.github.com/johnlcox/d6dded9807c5f6580626) with what some different patterns might look like.

My gist from early 2014 includes Guava `Optional` matching (I hadn't yet noticed that Java 8 included it's own `Optional` type), Integer matching as an example of matching on exact values, Cons like matching on a list, and the concept of an `orElse` case. I wrote these examples directly in the gist editor, I'm quite sure they don't compile, but I wanted to get the concept out of my head and stored somewhere. Once I got the idea out of my head, I promptly forgot about it for just over a year.

In May 2015 I was starting to use Java 8 on some real projects, and one day that old gist popped into my head. I started thinking about it more and decided it might be worth giving a more in-depth look. Initially, I did some searches to see if any libraries had already been created for this. I found a couple that had some pattern matching features, but they were not exactly what I had imagined. [Javaslang](https://github.com/javaslang), provides a lot of nice functional features that are missing from Java 8, but pattern matching isn't the focus of this library, and it only has support for matching on type and value. Benji Weber gives examples of pattern matching on his [blog](http://benjiweber.co.uk/blog/2014/08/26/deep-pattern-matching-in-java/) and implemented them in his [expressions library](https://github.com/benjiman/expressions).

The expressions library pattern matching was closer to what I had in mind. It can extract top-level and nested values, but it requires implementing a 'constructor' method for anything you want to match on and doesn't built-in matching for things like `Optional` or `List`. At this point I decided I'd give a shot at implementing pattern matching in Java 8 that is as close to the Scala pattern matching as possible. I like to try to come up with a good name for my projects, so I spent some time with a thesaurus looking for words related to 'matching' and 'patterns', and I eventually landed on [motif](http://dictionary.reference.com/browse/motif).

Before I go into some details about the process of implementing motif, below are some examples of what code using motif might look like.

Matching on Optional:

```java
Optional<Person> personOpt = getPerson();
match(personOpt)
    .when(some(any())).then(person -> doStuff(person))
    .when(none()).then(() -> System.out.println("Person not found"))
    .doMatch();
```

Nested matching:

```java
Optional<Tuple2<String, String>> opt = Optional.of(Tuple2.of("first", "second"));
match(opt)
    .when(some(tuple2(eq("third"), any()))).then(b -> doStuff(b))
    .when(some(tuple2(any(), eq("second")))).then(a -> doStuff(a))
    .when(none()).then(() -> System.out.println("Tuple not found"))
    .doMatch();
```

Checkout the [Github page](http://john.leacox.com/motif/) or [Github repo](https://github.com/johnlcox/motif) for additional details. Version 0.1 of motif is available from maven central. It is a little more verbose (horizontally) than Scala, but it provides much of the same functionality. Currently, it supports extracting a maximum of 3 parameters, whereas Scala supports up to 22 in 2.10 and possibly unlimited in 2.11+? I've rarely found myself needing to extract more than 3 parameters in Scala, so I thought this would be an OK limitation for now. Support for additional parameters could be added in the future, but it will require writing additional code generation logic.

Motif provides many useful pattern matchers out of the box, but it is also very extensible. A Guava extension could be created, for instance, that provides matchers for Guava's `Optional` and any other Guava concepts that would be useful to match on. The motif-generator project provides builders for generating matcher cases for extensions. [OptionalCasesGenerator](https://github.com/johnlcox/motif/blob/master/generator/src/main/java/com/leacox/motif/cases/OptionalCasesGenerator.java) is a good example for using the generator.

The implementation of the Motif pattern matching happened in three phases. The initial phase was a varargs method that accepted the matching cases, and automatically executed the matching. This ran into ambiguity issues for consumers of the code, so I ended up scrapping it and converting to a fluent interface. By using a fluent interface, I could use intermediate classes to track types and avoid ambiguity. This second phase led to what is essentially the final API, except without nested extraction. Once I saw that the fluent interface was working well, I added nested extraction as a third phase. The nested extraction leads to a bit of combinatorial explosion of the API, so I added code generation during this phase to reduce the likelyhood of errors and to avoid writing very similar code multiple times. The code generation portion, is a separate library, and makes it easy for third party extensions to generate all of the necessary methods needed.

Motif has been released as version 0.1 and is available in Maven central. The API is pretty solid, and I don't expect any dramatic changes in the future. Give it a try in your Java 8 code.
