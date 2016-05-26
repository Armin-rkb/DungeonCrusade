using UnityEngine;
using System.Collections;

public class Teleport : MonoBehaviour {

	void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.player)
        {

        }
    }
}
