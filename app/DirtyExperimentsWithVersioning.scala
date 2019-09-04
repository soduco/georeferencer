import java.awt.geom.Point2D

import akka.japi.tuple.Tuple20
import javax.swing.JList
import org.geotools.geometry.{DirectPosition2D, DirectPosition3D}
import org.geotools.referencing.CRS
import org.opengis.referencing.crs.CRSFactory
import org.opengis.referencing.cs.CoordinateSystem

object DirtyExperimentsWithVersioning extends App {
  import org.json4s._
  import org.json4s.JsonDSL._
  import org.json4s.jackson.JsonMethods._
  import org.json4s.jackson.Serialization
  import org.json4s.jackson.Serialization.{read, write}
  import org.opengis.geometry.DirectPosition


  case class GeorefMetadata[A <% DirectPosition](
                           sourceRef: String,
                           targetRef: String,
                           targetCRS: CoordinateSystem,
                           controlPoints: Seq[(A,A)]
                           ){
    def json(): String ={
      implicit val crs = this.targetCRS
      implicit val formats = Serialization.formats(NoTypeHints) + new GeorefMetadataSerializerJSON
      write(this)
    }
  }


  class GeorefMetadataSerializerJSON[A <% DirectPosition]( implicit val crs: CoordinateSystem ) extends CustomSerializer[GeorefMetadata[DirectPosition]]( format => (
    {
      case _ => GeorefMetadata("","",crs,List((new DirectPosition2D(0,0),new DirectPosition2D(0,0))))
    },
    {
      case georef: GeorefMetadata[A] => JObject(
        "crs" -> JString(georef.targetCRS.getName.toString),
        "controlpoints" -> JArray(georef.controlPoints.map( p =>
          JObject(
            "src" -> JObject(
                "crs" -> JString(p._1.getCoordinateReferenceSystem.getName.toString),
                "coordinates" -> JArray(p._2.getCoordinate.map(JDouble).toList)
              ),
            "dst" -> JObject(
              "crs" -> JString(p._1.getCoordinateReferenceSystem.getName.toString),
              "coordinates" -> JArray(p._2.getCoordinate.map(JDouble).toList)
            )
            )
          ).toList
        )
      )
    }// Serialize
  ))


  implicit val formats = Serialization.formats(NoTypeHints) + new DirectPositionSerializerJSON
  println(write(new DirectPosition2D(CRS.decode("EPSG:4326"), 10.0, 20.0)))
}