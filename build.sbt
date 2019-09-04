name := """Georeferencer"""

version := "1.0-SNAPSHOT"

val geotoolsVersion = "21.2"
val json4sVersion = "3.6.7"
val jgitVersion = "4.5.0.201609210915-r"

lazy val root = (project in file(".")).enablePlugins(PlayScala).settings(
  watchSources ++= (baseDirectory.value / "public/ui" ** "*").get
)

resolvers += Resolver.sonatypeRepo("snapshots")
resolvers += "osgeo" at "http://download.osgeo.org/webdav/geotools"
resolvers += "boundless" at "http://repo.boundlessgeo.com/main"
resolvers += "imageio" at "http://maven.geo-solutions.it"

scalaVersion := "2.12.8"

libraryDependencies += guice
libraryDependencies += "org.scalatestplus.play" %% "scalatestplus-play" % "4.0.2" % Test
libraryDependencies += "com.h2database" % "h2" % "1.4.199"

libraryDependencies +=  "org.geotools" % "gt-main" % geotoolsVersion
libraryDependencies +=  "org.geotools" % "gt-epsg-hsql" % geotoolsVersion
libraryDependencies += "org.json4s" %% "json4s-jackson" % json4sVersion
libraryDependencies += "org.eclipse.jgit" % "org.eclipse.jgit" % jgitVersion

