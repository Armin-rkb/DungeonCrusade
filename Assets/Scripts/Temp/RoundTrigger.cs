using UnityEngine;
using System.Collections;

public class RoundTrigger : MonoBehaviour {

  

    private HealthPlayer _playerHealth;

    void OnTriggerEnter2D(Collider2D coll)
    {
        if (coll.gameObject.tag == GameTags.player)
        {
            print("Ouch!");
            coll.GetComponent<HealthPlayer>().ChangeHealth(1f);
            this.GetComponent<SpriteRenderer>().color = new Color(0, 255, 0);
        }
    }

    void OnTriggerExit2D(Collider2D coll)
    {
        if (coll.gameObject.tag == GameTags.player)
        {
            this.GetComponent<SpriteRenderer>().color = new Color(255, 0, 0);
        }
    }
}
