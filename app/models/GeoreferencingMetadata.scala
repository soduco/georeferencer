package models

import org.geotools.geometry.DirectPosition2D
import org.json4s.JsonDSL.WithDouble._

/*
  Stores all the metadata needed to perform a georeferencing :
  - location of the image to georeference
  - location of the reference image
  - control points
  - source SCR
  - reference SCR
  - GeoTransform : transformation type, parameter values.
 */
  // TODO : replace URI strings with a decent URI type like the one from scala-uri
case class GeoreferencingMetadata(
                              sourceURI: String,
                              targetURI: String,
                              controlPoints: Seq[(DirectPosition2D, DirectPosition2D)]
                              ) {

}