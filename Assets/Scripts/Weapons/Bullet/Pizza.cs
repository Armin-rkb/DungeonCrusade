using UnityEngine;
using System.Collections;

public class Pizza : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbPizza;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    [SerializeField] private GameObject pizzaExplosion;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Pizza);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Pizza);
    }

    void FixedUpdate()
    {
        if (isRight)
            rbPizza.velocity = new Vector2(speed, rbPizza.velocity.y);
        else if (isLeft)
            rbPizza.velocity = new Vector2(-speed, rbPizza.velocity.y);
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        Instantiate(pizzaExplosion, player.transform.position, player.transform.rotation);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }
            else
            {
                isRight = false;
                isLeft = false;
                rbPizza.isKinematic = true;
                gameObject.AddComponent<Fade>();
            }
        }
    }
}
