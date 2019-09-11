package models

import play.api.libs.json.{JsResult, JsSuccess, JsValue, Json, Writes}

case class ControlPoint(pointid: Int, x:Double, y: Double, lat: Double, lng: Double)

case class GeorectifyQuery(url: String, points: Seq[ControlPoint]) {
  def toJSON(): JsValue ={
    implicit val cpWrites =  Json.writes[ControlPoint]
    Json.toJson(this)(Json.writes[GeorectifyQuery])
  }
}

object GeorectifyQuery {

  def fromJSON(json:JsValue): JsResult[GeorectifyQuery] = {
    implicit val cpReads = Json.reads[ControlPoint]
    Json.fromJson(json)(Json.reads[GeorectifyQuery])
  }

}

/*
trait Transform  // Dummy trait waiting to be replaced by some Geotools (or else) class

case class Georectify(georeferenceable: Citation,
                                  georeferences: Seq[Citation],
                                  controlPoints: Seq[(DirectPosition, DirectPosition, Short)]){

  def toJSON: JsValue = Json.obj()
}

object Georectify {
  def apply(source: Coverage,
            references: Seq[Coverage],
            cp: Seq[(DirectPosition, DirectPosition, Short)]
           ): Georectify = {
    // Ensure all control points do link refer to a reference GeoSource used for this georeferencing
    cp.foreach {
      case cp @ (_, _, n) if n < 0 || n >= references.length =>
        throw new IndexOutOfBoundsException(s"Control point $cp reference index is out of bound.")
    }
    new Georectify(source, references, cp)
  }

}
 */
